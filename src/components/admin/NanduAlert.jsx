import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const variants = {
  success: { Icon: CheckCircle2, style: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  error: { Icon: AlertCircle, style: "border-rose-200 bg-rose-50 text-rose-800" },
  info: { Icon: Info, style: "border-blue-200 bg-blue-50 text-blue-800" },
};

export default function NanduAlert({
  message,
  type = "success",
  onDismiss,
  actionLabel,
  onAction,
  className = "",
}) {
  const reduceMotion = useReducedMotion();
  const { Icon, style } = variants[type] || variants.info;
  const duration = reduceMotion ? 0 : 0.2;

  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key={`${type}-${message}`}
          role={type === "error" ? "alert" : "status"}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration }}
          className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${style} ${className}`}
        >
          <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 break-words">{message}</p>
          {onAction && actionLabel && (
            <button type="button" onClick={onAction} className="shrink-0 font-bold underline underline-offset-2">
              {actionLabel}
            </button>
          )}
          {onDismiss && (
            <button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="shrink-0 rounded p-1 hover:bg-black/5">
              <X size={16} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
