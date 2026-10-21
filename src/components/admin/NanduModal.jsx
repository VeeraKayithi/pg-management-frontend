import { useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const WIDTH = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-4xl" };

/** Shared NANDU modal. Children are held during exit so changing parent state
 * does not blank the dialog halfway through the closing animation. */
export default function NanduModal({
  open, onClose, children, titleId, ariaLabel, size = "md", zIndex = 100,
  role = "dialog", disableClose = false, closeOnBackdrop = true,
  panelClassName = "", backdropClassName = "",
}) {
  const reduceMotion = useReducedMotion();
  const cachedContent = useRef(children);
  if (open) cachedContent.current = children;
  const duration = reduceMotion ? 0 : 0.2;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="nandu-modal"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration }}
          className={`fixed inset-0 flex items-center justify-center bg-[#0E253C]/55 p-3 sm:p-6 ${backdropClassName}`}
          style={{ zIndex }}
          onMouseDown={(event) => {
            if (closeOnBackdrop && !disableClose && event.target === event.currentTarget) onClose?.();
          }}
        >
          <motion.section
            role={role} aria-modal="true" aria-labelledby={titleId || undefined}
            aria-label={titleId ? undefined : ariaLabel}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration, ease: "easeOut" }}
            className={`max-h-[92vh] w-full overflow-y-auto rounded-xl border border-[#D9E3EA] bg-white shadow-2xl ${WIDTH[size] || WIDTH.md} ${panelClassName}`}
          >
            {cachedContent.current}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
