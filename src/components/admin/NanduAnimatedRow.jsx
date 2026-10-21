import { motion, useReducedMotion } from "framer-motion";

// Shared, lightweight row entrance/exit motion. No layout scaling or reordering.
function useRowMotion() {
  const reduceMotion = useReducedMotion();
  return {
    initial: reduceMotion ? false : { opacity: 0, y: 5 },
    animate: { opacity: 1, y: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 },
    transition: { duration: reduceMotion ? 0 : 0.18, ease: "easeOut" },
  };
}

export function NanduTableRow({ children, ...props }) {
  const animation = useRowMotion();
  return <motion.tr {...animation} {...props}>{children}</motion.tr>;
}

export function NanduListRow({ children, ...props }) {
  const animation = useRowMotion();
  return <motion.div {...animation} {...props}>{children}</motion.div>;
}
