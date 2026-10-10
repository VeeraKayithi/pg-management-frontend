import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import {
  dismissNotification,
  getMyDismissedNotifications,
  getMyNotifications,
  getMyUnreadNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationService.js";
import { getRole } from "../services/authService.js";

const TABS = [
  { value: "all", label: "All" },
  { value: "dismissed", label: "Dismissed" },
];

const PAGE_VARIANTS = {
  hidden: { opacity: 0, y: 18, scale: 0.995 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

function formatDate(value) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getSeverityPresentation(severity) {
  switch (severity?.toUpperCase()) {
    case "WARNING":
      return {
        label: "Attention",
        card: "border-amber-200 bg-amber-50/40",
        badge: "border-amber-300 bg-amber-100 text-amber-800",
        accent: "bg-amber-500",
        iconBox: "bg-amber-100 text-amber-700",
        icon: "!",
        noticeTitle: "Attention required",
        noticeText: "Please review this notice and plan accordingly.",
        notice: "border-amber-200 bg-amber-50 text-amber-800",
      };

    case "URGENT":
      return {
        label: "Urgent",
        card: "border-orange-300 bg-orange-50/50",
        badge: "border-orange-300 bg-orange-100 text-orange-800",
        accent: "bg-orange-500",
        iconBox: "bg-orange-100 text-orange-700",
        icon: "!",
        noticeTitle: "Immediate attention",
        noticeText: "Please review this urgent notice as soon as possible.",
        notice: "border-orange-200 bg-orange-50 text-orange-800",
      };

    case "ERROR":
      return {
        label: "Error",
        card: "border-rose-300 bg-rose-50/50",
        badge: "border-rose-300 bg-rose-100 text-rose-800",
        accent: "bg-rose-500",
        iconBox: "bg-rose-100 text-rose-700",
        icon: "×",
        noticeTitle: "Action could not be completed",
        noticeText: "Review the details or contact the PG administration.",
        notice: "border-rose-200 bg-rose-50 text-rose-800",
      };

    default:
      return {
        label: "Information",
        card: "border-slate-200 bg-white",
        badge: "border-slate-200 bg-slate-50 text-slate-700",
        accent: "bg-slate-400",
        iconBox: "bg-slate-100 text-slate-600",
        icon: "i",
        noticeTitle: "",
        noticeText: "",
        notice: "",
      };
  }
}

function getErrorMessage(error, fallback) {
  const data = error.response?.data;
  if (typeof data?.message === "string") return data.message;

  if (data && typeof data === "object") {
    const messages = Object.values(data).filter(
      (value) => typeof value === "string"
    );
    if (messages.length > 0) return messages.join(" ");
  }

  return fallback;
}

export default function Notifications() {
  const navigate = useNavigate();
  const hasInitialized = useRef(false);
  const skipNextTabLoad = useRef(true);

  const role = getRole()?.replace("ROLE_", "").toUpperCase();
  const dashboardPath =
    role === "ADMIN" ? "/admin/dashboard" : "/tenant/dashboard";

  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let response;
      if (activeTab === "unread") {
        response = await getMyUnreadNotifications();
      } else if (activeTab === "dismissed") {
        response = await getMyDismissedNotifications();
      } else {
        response = await getMyNotifications();
      }

      setNotifications(Array.isArray(response) ? response : []);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load notifications."));
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      try {
        setLoading(true);
        setError("");
        await markAllNotificationsAsRead();
        window.dispatchEvent(new CustomEvent("notifications:updated"));
        const response = await getMyNotifications();
        setNotifications(Array.isArray(response) ? response : []);
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "Unable to open the Notification Center."
          )
        );
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    if (!hasInitialized.current) return;
    if (skipNextTabLoad.current) {
      skipNextTabLoad.current = false;
      return;
    }
    loadNotifications();
  }, [activeTab, loadNotifications]);

  const returnToDashboard = () => navigate(dashboardPath);

  const openNotification = async (notification) => {
    try {
      setProcessingId(notification.notificationId);
      setError("");

      if (!notification.read) {
        await markNotificationAsRead(notification.notificationId);
        window.dispatchEvent(new CustomEvent("notifications:updated"));
      }

      if (notification.deepLink) {
        navigate(notification.deepLink);
      } else {
        await loadNotifications();
      }
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Unable to open the notification.")
      );
    } finally {
      setProcessingId(null);
    }
  };

  const dismiss = async (notificationId) => {
    const previousNotifications = notifications;

    try {
      setProcessingId(notificationId);
      setError("");
      setNotifications((current) =>
        current.filter(
          (notification) => notification.notificationId !== notificationId
        )
      );

      await dismissNotification(notificationId);
      window.dispatchEvent(new CustomEvent("notifications:updated"));
    } catch (requestError) {
      setNotifications(previousNotifications);
      setError(
        getErrorMessage(requestError, "Unable to dismiss the notification.")
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <motion.main
      variants={PAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-[#F5F5F0] px-4 py-6 text-stone-900 sm:px-8 sm:py-8"
    >
      <div className="mx-auto max-w-5xl">
        <header className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">
                Notification Center
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tighter">
                Your notifications
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Warnings request attention. Urgent notices require prompt review.
              </p>
            </div>

            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={returnToDashboard}
              className="rounded-full border border-stone-300 px-5 py-2.5 text-[8px] font-bold uppercase tracking-widest hover:border-stone-900"
            >
              Dashboard
            </motion.button>
          </div>
        </header>

        <section className="mt-6 flex flex-col gap-4 rounded-[2rem] border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex gap-1 overflow-x-auto rounded-full bg-stone-100 p-1">
            {TABS.map((tab) => (
              <motion.button
                key={tab.value}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setActiveTab(tab.value)}
                className={`relative shrink-0 rounded-full px-5 py-2.5 text-[8px] font-bold uppercase tracking-widest ${activeTab === tab.value
                    ? "text-white"
                    : "text-stone-500 hover:bg-white hover:text-stone-900"
                  }`}
              >
                {activeTab === tab.value && (
                  <motion.span
                    layoutId="notification-active-tab"
                    className="absolute inset-0 rounded-full bg-stone-900"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </motion.button>
            ))}
          </nav>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={loadNotifications}
            disabled={loading}
            className="rounded-full bg-stone-900 px-5 py-2.5 text-[8px] font-bold uppercase tracking-widest text-white disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </motion.button>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        <section className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-44 animate-pulse rounded-[2rem] bg-white"
                />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-[2rem] border border-stone-200 bg-white p-12 text-center shadow-sm">
              <h2 className="text-2xl font-black tracking-tighter">
                No {activeTab} notifications
              </h2>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {notifications.map((notification, index) => {
                  const style = getSeverityPresentation(notification.severity);
                  const needsAttention = ["WARNING", "URGENT", "ERROR"].includes(
                    notification.severity?.toUpperCase()
                  );

                  return (
                    <motion.article
                      key={notification.notificationId}
                      layout
                      initial={{ opacity: 0, y: 12, scale: 0.99 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale:
                          notification.severity?.toUpperCase() === "WARNING"
                            ? [0.99, 1.01, 1]
                            : 1,
                      }}
                      exit={{
                        opacity: 0,
                        x: 36,
                        scale: 0.98,
                        height: 0,
                        marginBottom: 0,
                      }}
                      transition={{
                        delay: index * 0.025,
                        duration: 0.25,
                        layout: {
                          type: "spring",
                          stiffness: 380,
                          damping: 34,
                        },
                      }}
                      className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-sm transition-shadow hover:shadow-md ${style.card}`}
                    >
                      <div
                        className={`absolute inset-y-0 left-0 w-1.5 ${style.accent}`}
                      />

                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1 pl-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-[7px] font-bold uppercase tracking-widest ${style.badge}`}
                            >
                              {style.label}
                            </span>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-stone-400">
                              {notification.sourceModule}
                            </span>
                          </div>

                          <div className="mt-4 flex items-start gap-3">
                            <span
                              aria-hidden="true"
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${style.iconBox}`}
                            >
                              {style.icon}
                            </span>
                            <div>
                              <h2 className="text-2xl font-black tracking-tighter">
                                {notification.title}
                              </h2>
                              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                                {notification.message}
                              </p>
                            </div>
                          </div>

                          {needsAttention && (
                            <div
                              className={`mt-5 rounded-2xl border p-4 ${style.notice}`}
                            >
                              <p className="text-[9px] font-black uppercase tracking-widest">
                                {style.noticeTitle}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed">
                                {style.noticeText}
                              </p>
                            </div>
                          )}

                          <p className="mt-4 text-xs text-stone-400">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          {!notification.dismissed && (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.96 }}
                              disabled={
                                processingId === notification.notificationId
                              }
                              onClick={() =>
                                dismiss(notification.notificationId)
                              }
                              className="rounded-full border border-stone-900 px-4 py-2.5 text-[8px] font-bold uppercase tracking-widest hover:bg-stone-900 hover:text-white disabled:opacity-50"
                            >
                              Dismiss
                            </motion.button>
                          )}

                          {notification.deepLink && (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.96 }}
                              disabled={
                                processingId === notification.notificationId
                              }
                              onClick={() => openNotification(notification)}
                              className="rounded-full bg-stone-900 px-4 py-2.5 text-[8px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
                            >
                              View
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
    </motion.main>
  );
}
