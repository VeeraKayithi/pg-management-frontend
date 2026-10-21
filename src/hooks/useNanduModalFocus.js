import { useEffect, useRef } from "react";

const FOCUSABLE = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const visibleControls = (dialog) =>
  Array.from(dialog.querySelectorAll(FOCUSABLE)).filter(
    (element) =>
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== "hidden"
  );

/**
 * Global modal focus and scroll management.
 * Install once in App.jsx.
 *
 * Automatically detects dialogs using aria-modal="true".
 */
export default function useNanduModalFocus(
  isOpen,
  onClose,
  canClose = true
) {
  const legacyRef = useRef(null);

  useEffect(() => {
    // The global manager handles all modal dialogs.
    if (typeof isOpen === "boolean") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow =
      document.documentElement.style.overflow;

    const focusOrigins = new WeakMap();

    let current = null;
    let lockActive = false;

    const dialogs = () =>
      Array.from(
        document.querySelectorAll(
          '[aria-modal="true"][role="dialog"], ' +
          '[aria-modal="true"][role="alertdialog"]'
        )
      ).filter(
        (element) => element.getClientRects().length > 0
      );

    const getActiveDialog = () => {
      const all = dialogs();

      if (!all.length) return null;

      return all[all.length - 1];
    };

    const reconcile = () => {
      const next = getActiveDialog();

      if (next === current) return;

      const old = current;
      current = next;

      if (next) {
        if (!lockActive) {
          document.body.style.overflow = "hidden";
          document.documentElement.style.overflow = "hidden";
          lockActive = true;
        }

        if (!focusOrigins.has(next)) {
          focusOrigins.set(next, document.activeElement);
        }

        queueMicrotask(() => {
          if (current !== next || !next.isConnected) {
            return;
          }

          if (next.contains(document.activeElement)) {
            return;
          }

          const first = visibleControls(next)[0];

          if (first) {
            first.focus({ preventScroll: true });
          } else {
            if (!next.hasAttribute("tabindex")) {
              next.setAttribute("tabindex", "-1");
            }

            next.focus({ preventScroll: true });
          }
        });
      } else if (lockActive) {
        document.body.style.overflow = previousOverflow;

        document.documentElement.style.overflow =
          previousHtmlOverflow;

        lockActive = false;
      }

      if (old && old !== next) {
        const origin = focusOrigins.get(old);

        queueMicrotask(() => {
          if (current && !current.contains(origin)) {
            return;
          }

          if (
            origin?.isConnected &&
            !origin.hasAttribute("disabled")
          ) {
            origin.focus({ preventScroll: true });
          }
        });
      }
    };

    const observer = new MutationObserver(reconcile);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-modal"],
    });

    reconcile();

    const keyDown = (event) => {
      const dialog = getActiveDialog();

      if (!dialog) return;

      // Allow portaled NANDU calendar or select
      // components to handle their own keyboard input.
      const externalPopover = event.target.closest?.(
        "[data-nandu-popover]"
      );

      if (externalPopover) return;

      if (event.key === "Escape") {
        // Let an expanded calendar or dropdown
        // handle Escape independently.
        const expanded = dialog.querySelector(
          '[aria-expanded="true"][aria-haspopup]'
        );

        if (expanded) return;

        const cancel = Array.from(
          dialog.querySelectorAll("button")
        ).find(
          (element) =>
            !element.disabled &&
            /^(cancel|close|dismiss|back)$/i.test(
              element.textContent.trim()
            )
        );

        const closeButton = dialog.querySelector(
          'button[aria-label="Close"], ' +
          'button[aria-label^="Close "]'
        );

        const action =
          cancel ||
          (closeButton?.disabled ? null : closeButton);

        if (action) {
          event.preventDefault();
          event.stopPropagation();
          action.click();
        }

        return;
      }

      if (event.key !== "Tab") return;

      const controls = visibleControls(dialog);

      if (!controls.length) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const first = controls[0];
      const last = controls[controls.length - 1];

      if (
        event.shiftKey &&
        (
          document.activeElement === first ||
          !dialog.contains(document.activeElement)
        )
      ) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (
        !event.shiftKey &&
        (
          document.activeElement === last ||
          !dialog.contains(document.activeElement)
        )
      ) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", keyDown, true);

    return () => {
      observer.disconnect();

      document.removeEventListener(
        "keydown",
        keyDown,
        true
      );

      if (lockActive) {
        document.body.style.overflow = previousOverflow;

        document.documentElement.style.overflow =
          previousHtmlOverflow;
      }
    };
  }, [isOpen]);

  return legacyRef;
}