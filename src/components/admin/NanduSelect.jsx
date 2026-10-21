import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

/** NANDU dropdown: keyboard accessible and positioned outside scrolling modals. */
export default function NanduSelect({
  value,
  onChange,
  options = [],
  label,
  placeholder = "Select an option",
  disabled = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);
  const id = useId();
  const selectedIndex = options.findIndex((item) => String(item.value) === String(value ?? ""));
  const selected = options[selectedIndex];

  const firstEnabled = () => options.findIndex((option) => !option.disabled);

  const calculatePosition = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    // Respect modal header/footer boundaries, not just the viewport.
    const dialog = button.closest('[role="dialog"]');
    const header = dialog?.querySelector(":scope > header");
    const footer = dialog?.querySelector(":scope > footer");
    const dialogRect = dialog?.getBoundingClientRect();
    const headerRect = header?.getBoundingClientRect();
    const footerRect = footer?.getBoundingClientRect();
    const upperLimit = Math.max(8, headerRect?.bottom ?? dialogRect?.top ?? 8);
    const lowerLimit = Math.min(window.innerHeight - 8, footerRect?.top ?? dialogRect?.bottom ?? window.innerHeight - 8);
    const below = Math.max(0, lowerLimit - rect.bottom - 6);
    const above = Math.max(0, rect.top - upperLimit - 6);
    const preferredHeight = Math.min(240, options.length * 43 + 12);
    const upward = below < preferredHeight && above > below;
    const availableHeight = upward ? above : below;
    const height = Math.min(preferredHeight, availableHeight);
    setPosition({
      top: upward ? rect.top - 6 - height : rect.bottom + 6,
      left: Math.max(8, rect.left),
      width: Math.min(rect.width, window.innerWidth - Math.max(8, rect.left) - 8),
      maxHeight: Math.max(0, height),
    });
  };

  useLayoutEffect(() => {
    if (open) calculatePosition();
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onScrollOrResize = (event) => {
      // A scrolling parent moves the trigger; dismiss to avoid a floating stale menu.
      if (event.type === "scroll") {
        if (!menuRef.current?.contains(event.target)) setOpen(false);
      }
      else calculatePosition();
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[active]?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, position?.top]);

  const show = () => {
    if (disabled || !options.some((option) => !option.disabled)) return;
    setActive(selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : firstEnabled());
    setOpen(true);
  };

  const choose = (index) => {
    if (!options[index] || options[index].disabled) return;
    onChange(options[index].value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const move = (start, direction) => {
    for (let n = 0; n < options.length; n++) {
      const index = (start + direction * (n + 1) + options.length * 2) % options.length;
      if (!options[index].disabled) return index;
    }
    return start;
  };

  const onKeyDown = (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape", "Tab"].includes(event.key)) return;
    if (event.key === "Tab") { setOpen(false); return; }
    if (event.key === "Escape") { if (open) event.preventDefault(); setOpen(false); return; }
    event.preventDefault();
    if (!open) { show(); return; }
    if (event.key === "ArrowDown") setActive((i) => move(i, 1));
    if (event.key === "ArrowUp") setActive((i) => move(i, -1));
    if (event.key === "Home") setActive(move(options.length - 1, 1));
    if (event.key === "End") setActive(move(0, -1));
    if (event.key === "Enter" || event.key === " ") choose(active);
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      {label && <div id={`${id}-label`} className="mb-1.5 text-xs font-semibold text-[#183B5B]">{label}</div>}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={!label ? placeholder : undefined}
        aria-labelledby={label ? `${id}-label ${id}-value` : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-options` : undefined}
        aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
        onKeyDown={onKeyDown}
        onClick={() => open ? setOpen(false) : show()}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3.5 py-2.5 text-left text-sm shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183B5B] disabled:cursor-not-allowed disabled:opacity-50 ${open ? "border-[#183B5B] ring-2 ring-[#183B5B]/10" : "border-[#CDD8E3] hover:border-[#7899B7]"}`}
      >
        <span id={`${id}-value`} className={`min-w-0 flex-1 truncate ${selected ? "font-medium text-[#183B5B]" : "text-slate-400"}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-[#647B91] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && position?.maxHeight > 0 && createPortal(
        <div
          ref={menuRef}
          id={`${id}-options`}
          role="listbox"
          aria-labelledby={label ? `${id}-label` : undefined}
          style={{ position: "fixed", top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight, zIndex: 9999 }}
          className="overflow-y-auto rounded-xl border border-[#D7E2EB] bg-white p-1.5 shadow-[0_14px_35px_rgba(24,59,91,0.18)]"
        >
          {options.map((item, index) => {
            const checked = String(item.value) === String(value ?? "");
            return (
              <button key={String(item.value)} id={`${id}-option-${index}`}
                ref={(node) => { optionRefs.current[index] = node; }}
                role="option" aria-selected={checked} tabIndex={-1} type="button" disabled={item.disabled}
                onMouseEnter={() => { if (!item.disabled) setActive(index); }} onClick={() => choose(index)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition disabled:opacity-40 ${index === active ? "bg-[#E8F0F7] text-[#183B5B]" : "text-[#334E68]"} ${checked ? "font-bold" : "font-medium"}`}>
                <span className="truncate">{item.label}</span>
                {checked && <Check size={15} className="shrink-0 text-[#183B5B]" />}
              </button>
            );
          })}
        </div>, document.body
      )}
    </div>
  );
}
