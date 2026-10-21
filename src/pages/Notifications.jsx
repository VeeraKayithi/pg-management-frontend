import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, RefreshCw, ArrowLeft, ArrowUpRight, Archive, CircleAlert } from "lucide-react";
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

  const role = getRole()
    ?.replace("ROLE_", "")
    ?.toUpperCase();

  const managementRoles = [
    "ADMIN",
    "BUILDING_ADMIN",
    "SUPERVISOR",
  ];

  const dashboardPath =
    managementRoles.includes(role)
      ? "/admin/dashboard"
      : "/tenant/dashboard";

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
    <motion.main variants={PAGE_VARIANTS} initial="hidden" animate="visible" className="min-h-screen bg-[var(--pg-bg)] px-4 py-5 text-[var(--pg-text)] sm:px-6 sm:py-7 xl:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wide text-[#B33A3A]">Management workspace</p><h1 className="mt-1 text-2xl font-bold text-[var(--pg-heading)]">Notifications</h1><p className="mt-1 text-sm text-[var(--pg-text-muted)]">Messages and updates for your account.</p></div>
          <button type="button" onClick={returnToDashboard} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] px-4 text-sm font-semibold text-[var(--pg-heading)]"><ArrowLeft size={16}/>Overview</button>
        </div>
        <section className="mt-6 overflow-hidden rounded-xl border border-[var(--pg-border)] bg-[var(--pg-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--pg-border)] px-5 py-4">
            <div className="flex gap-2" role="group" aria-label="Notification filters">{TABS.map((tab)=><button type="button" key={tab.value} aria-pressed={activeTab===tab.value} onClick={()=>setActiveTab(tab.value)} className={`min-h-10 rounded-lg px-4 text-sm font-semibold ${activeTab===tab.value ? "bg-[#183B5B] text-white" : "bg-[var(--pg-bg)] text-[var(--pg-heading)] hover:bg-[#E8F0F7]"}`}>{tab.label}</button>)}</div>
            <button type="button" onClick={loadNotifications} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--pg-border)] px-4 text-sm font-semibold text-[var(--pg-heading)] disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/>Refresh</button>
          </div>
          {error && <div role="alert" className="m-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><CircleAlert size={17}/>{error}</div>}
          {loading ? <div className="p-6 text-sm text-[var(--pg-text-muted)]">Loading notifications…</div> : notifications.length === 0 ? <div className="flex flex-col items-center gap-2 px-6 py-14 text-center text-[var(--pg-text-muted)]"><Bell size={27}/><p className="font-semibold">No {activeTab === "dismissed" ? "dismissed" : "current"} notifications</p></div> : <div className="divide-y divide-[var(--pg-border)]"><AnimatePresence>{notifications.map((n)=>{const style=getSeverityPresentation(n.severity);return <motion.article layout initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} key={n.notificationId} className="flex flex-col gap-4 p-5 hover:bg-[var(--pg-bg)] sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-3"><span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.iconBox}`}><Bell size={18}/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${style.badge}`}>{style.label}</span>{n.sourceModule && <span className="text-xs text-[var(--pg-text-muted)]">{n.sourceModule}</span>}{!n.read && <span className="text-xs font-bold text-[#183B5B]">Unread</span>}</div><h2 className="mt-2 text-sm font-bold text-[var(--pg-heading)]">{n.title}</h2><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--pg-text)]">{n.message}</p><p className="mt-2 text-xs text-[var(--pg-text-muted)]">{formatDate(n.createdAt)}</p></div></div><div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">{n.deepLink && <button type="button" disabled={processingId===n.notificationId} onClick={()=>openNotification(n)} className="inline-flex items-center gap-1 rounded-lg bg-[#183B5B] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Open <ArrowUpRight size={14}/></button>}{!n.dismissed && <button type="button" disabled={processingId===n.notificationId} onClick={()=>dismiss(n.notificationId)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--pg-border)] px-3 py-2 text-xs font-semibold text-[var(--pg-heading)] disabled:opacity-50"><Archive size={14}/>Dismiss</button>}</div></motion.article>})}</AnimatePresence></div>}
        </section>
      </div>
    </motion.main>
  );
}
