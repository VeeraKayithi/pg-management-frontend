import { motion, useReducedMotion } from "framer-motion";

export default function NanduButton({
  children,
  disabled = false,
  className = "",
  type = "button",
  ...props
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={
        !disabled && !reduceMotion
          ? { y: -1 }
          : undefined
      }
      whileTap={
        !disabled && !reduceMotion
          ? { scale: 0.98 }
          : undefined
      }
      transition={{
        type: "spring",
        stiffness: 450,
        damping: 30,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}