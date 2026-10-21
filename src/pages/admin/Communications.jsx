import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AdminHeader from "../../components/admin/AdminHeader.jsx";
import { Send, RefreshCw, Eye, X, Check, History, Megaphone,  } from "lucide-react";
import NanduSelect from "../../components/admin/NanduSelect.jsx";
import useAutoDismiss from "../../hooks/useAutoDismiss.js";
import {
  getAnnouncementDeliveries,
  getAnnouncementHistory,
  previewAnnouncement,
  sendAnnouncement,
} from "../../services/announcementService.js";

const EMPTY_FORM = {
  title: "",
  message: "",
  priority: "NORMAL",
  inApp: true,
  email: true,
};

const priorityOptions = [
  { value: "NORMAL", label: "Normal" },
  { value: "IMPORTANT", label: "Important" },
  { value: "URGENT", label: "Urgent" },
];

function errorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

function formatDate(value) {
  if (!value) return "Not completed";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function Communications() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useAutoDismiss(error, useCallback(() => setError(""), []));
  useAutoDismiss(success, useCallback(() => setSuccess(""), []));

  const channels = useMemo(() => {
    const selected = [];
    if (form.inApp) selected.push("IN_APP");
    if (form.email) selected.push("EMAIL");
    return selected;
  }, [form.inApp, form.email]);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAnnouncementHistory();
      setHistory(Array.isArray(response) ? response : []);
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to load communication history."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (channels.length === 0) {
      setPreview(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await previewAnnouncement(channels);
        setPreview(response);
      } catch (requestError) {
        setError(errorMessage(requestError, "Unable to preview recipients."));
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [channels]);

  const validate = () => {
    if (!form.title.trim()) return "Announcement title is required.";
    if (!form.message.trim()) return "Announcement message is required.";
    if (form.title.trim().length > 150) return "Title must not exceed 150 characters.";
    if (form.message.trim().length > 2000) return "Message must not exceed 2000 characters.";
    if (channels.length === 0) return "Select at least one delivery channel.";
    if (!preview?.eligibleTenantCount) return "No eligible Tenants with active portal accounts are available.";
    return "";
  };

  const requestSend = (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setShowConfirmation(true);
  };

  const confirmSend = async () => {
    if (processing) {
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const response = await sendAnnouncement({
        title: form.title.trim(),
        message: form.message.trim(),
        priority: form.priority,
        channels,
        deepLink: "/tenant/dashboard",
      });

      /*
       * Close the confirmation modal immediately after
       * the backend confirms successful processing.
       */
      setShowConfirmation(false);

      /*
       * Reset every announcement form field.
       */
      setForm({
        ...EMPTY_FORM,
      });

      /*
       * Clear the old recipient preview temporarily.
       * It will be refreshed below using default channels.
       */
      setPreview(null);

      /*
       * Add the new announcement to history immediately.
       * This avoids waiting for another GET request before
       * displaying the newly sent announcement.
       */
      setHistory((currentHistory) => {
        const existingHistory =
          Array.isArray(currentHistory)
            ? currentHistory
            : [];

        return [
          response,
          ...existingHistory.filter(
            (announcement) =>
              announcement.announcementId !==
              response.announcementId
          ),
        ];
      });

      setSuccess(
        `Announcement completed successfully. ` +
        `${response.sentCount ?? 0} sent, ` +
        `${response.failedCount ?? 0} failed, and ` +
        `${response.skippedCount ?? 0} skipped.`
      );

      /*
       * Refresh from the backend after the UI has already
       * been updated. A history-refresh failure should not
       * reopen the modal or restore the submitted form.
       */
      try {
        const updatedHistory =
          await getAnnouncementHistory();

        setHistory(
          Array.isArray(updatedHistory)
            ? updatedHistory
            : []
        );
      } catch (historyError) {
        console.error(
          "Announcement was sent, but history refresh failed:",
          historyError
        );
      }

      /*
       * Refresh the recipient preview for the default
       * channels selected in EMPTY_FORM.
       */
      const defaultChannels = [];

      if (EMPTY_FORM.inApp) {
        defaultChannels.push("IN_APP");
      }

      if (EMPTY_FORM.email) {
        defaultChannels.push("EMAIL");
      }

      try {
        const updatedPreview =
          await previewAnnouncement(
            defaultChannels
          );

        setPreview(updatedPreview);
      } catch (previewError) {
        console.error(
          "Announcement was sent, but recipient preview refresh failed:",
          previewError
        );
      }
    } catch (requestError) {
      /*
       * Keep the modal open when sending fails so the Admin
       * can review the content and try again.
       */
      setError(
        errorMessage(
          requestError,
          "Unable to send the announcement."
        )
      );
    } finally {
      setProcessing(false);
    }
  };

  const showDeliveries = async (announcement) => {
    try {
      setSelectedAnnouncement(announcement);
      const response = await getAnnouncementDeliveries(announcement.announcementId);
      setDeliveries(Array.isArray(response) ? response : []);
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to load delivery details."));
    }
  };

  return (
    <main className="min-h-screen bg-[var(--pg-bg)] px-4 py-5 text-[var(--pg-text)] sm:px-6 sm:py-7 xl:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminHeader title="Communications" subtitle="Compose, review and track announcements." />
        {(error || success) && <div role="alert" className={`mt-5 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || success}</div>}
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
          <section className="overflow-visible rounded-xl border border-[var(--pg-border)] bg-[var(--pg-surface)]">
            <div className="flex items-center gap-2 border-b border-[var(--pg-border)] px-5 py-4">
              <Megaphone size={19} className="text-[#183B5B]" /><h2 className="text-base font-bold text-[var(--pg-heading)]">Compose announcement</h2>
            </div>
            <form onSubmit={requestSend} className="space-y-5 p-5">
              <label className="block text-sm font-semibold text-[var(--pg-heading)]">Title *
                <input required maxLength={150} value={form.title} onChange={(e) => setForm((c) => ({...c,title:e.target.value}))} placeholder="Announcement title" className="mt-2 block w-full rounded-lg border border-[var(--pg-border)] bg-[var(--pg-bg)] px-3 py-3 text-sm text-[var(--pg-text)] outline-none focus:border-[#183B5B]" />
              </label>
              <label className="block text-sm font-semibold text-[var(--pg-heading)]">Message *
                <textarea required rows={5} maxLength={2000} value={form.message} onChange={(e) => setForm((c) => ({...c,message:e.target.value}))} placeholder="Write the message for your residents" className="mt-2 block w-full resize-y rounded-lg border border-[var(--pg-border)] bg-[var(--pg-bg)] px-3 py-3 text-sm font-normal text-[var(--pg-text)] outline-none focus:border-[#183B5B]" />
                <span className="mt-1 block text-right text-xs font-normal text-[var(--pg-text-muted)]">{form.message.length} / 2000</span>
              </label>
              <NanduSelect label="Priority" value={form.priority} options={priorityOptions} onChange={(value) => setForm((c) => ({...c,priority:value}))} />
              <div><p className="mb-2 text-sm font-semibold text-[var(--pg-heading)]">Delivery channels</p>
                <div className="flex flex-wrap gap-3">
                  {[["inApp","In-app notifications"],["email","Email"]].map(([key,label]) => <button type="button" key={key} aria-pressed={form[key]} onClick={() => setForm((c) => ({...c,[key]:!c[key]}))} className={`flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold ${form[key] ? "border-[#183B5B] bg-[#E8F0F7] text-[#183B5B]" : "border-[var(--pg-border)] text-[var(--pg-text-muted)]"}`}>{form[key] ? <Check size={16}/> : <span className="h-4 w-4 rounded border border-current"/>}{label}</button>)}
                </div>
              </div>
              <div className="flex justify-end border-t border-[var(--pg-border)] pt-4"><button type="submit" disabled={processing} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#183B5B] px-5 text-sm font-bold text-white hover:bg-[#102F4B] disabled:opacity-50"><Eye size={17}/>Review and send</button></div>
            </form>
          </section>
          <aside className="space-y-5">
            <div className="rounded-xl border border-[var(--pg-border)] bg-[var(--pg-surface)]">
              <h2 className="border-b border-[var(--pg-border)] px-5 py-4 text-base font-bold text-[var(--pg-heading)]">Recipient preview</h2>
              <div className="grid grid-cols-2 gap-3 p-5">
                {[["Active residents",preview?.activeTenantCount],["Eligible recipients",preview?.eligibleTenantCount],["In-app eligible",preview?.inAppEligibleCount],["Without portal",preview?.tenantsWithoutPortalAccount]].map(([label,value])=><div key={label} className="rounded-lg bg-[var(--pg-bg)] p-3"><p className="text-2xl font-bold text-[#183B5B]">{value ?? "—"}</p><p className="mt-1 text-xs text-[var(--pg-text-muted)]">{label}</p></div>)}
              </div>
              <p className="px-5 pb-5 text-xs text-[var(--pg-text-muted)]">Recipient counts come from the server for the selected channels.</p>
            </div>
            <div className="rounded-xl border border-[var(--pg-border)] bg-[var(--pg-surface)] p-5"><h3 className="text-sm font-bold text-[var(--pg-heading)]">Delivery rules</h3><p className="mt-2 text-sm leading-6 text-[var(--pg-text-muted)]">Only eligible active residents with portal accounts are considered. Email delivery additionally requires an eligible email address. Individual failures appear in delivery reports.</p></div>
          </aside>
        </div>
        <section className="mt-6 overflow-hidden rounded-xl border border-[var(--pg-border)] bg-[var(--pg-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--pg-border)] px-5 py-4"><h2 className="flex items-center gap-2 text-base font-bold text-[var(--pg-heading)]"><History size={18}/>Announcement history</h2><button type="button" onClick={loadHistory} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[var(--pg-border)] px-3 py-2 text-xs font-semibold text-[var(--pg-heading)]"><RefreshCw size={15}/> Refresh</button></div>
          {loading ? <p className="p-6 text-sm text-[var(--pg-text-muted)]">Loading announcements…</p> : !history.length ? <p className="p-6 text-sm text-[var(--pg-text-muted)]">No announcements sent yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[690px] text-left text-sm"><thead className="bg-[var(--pg-bg)] text-xs uppercase tracking-wide text-[var(--pg-text-muted)]"><tr><th className="px-5 py-3">Announcement</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Delivery</th><th className="px-5 py-3">Action</th></tr></thead><tbody>{history.map((a)=><tr key={a.announcementId} className="border-t border-[var(--pg-border)]"><td className="px-5 py-4"><p className="font-semibold text-[var(--pg-heading)]">{a.title}</p><p className="mt-1 max-w-sm truncate text-xs text-[var(--pg-text-muted)]">{a.priority} · {a.status} · {a.message}</p></td><td className="px-4 py-4 text-[var(--pg-text-muted)]">{formatDate(a.createdAt)}</td><td className="px-4 py-4 text-xs">{a.sentCount ?? 0} sent · {a.failedCount ?? 0} failed · {a.skippedCount ?? 0} skipped</td><td className="px-5 py-4"><button type="button" onClick={()=>showDeliveries(a)} className="inline-flex items-center gap-1 font-semibold text-[#183B5B] hover:underline">Delivery details <Eye size={15}/></button></td></tr>)}</tbody></table></div>}
        </section>
      </div>
      <AnimatePresence>
        {showConfirmation && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-label="Review announcement" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-[#B33A3A]">Final review</p><h2 className="mt-1 text-xl font-bold text-[#183B5B]">Send announcement?</h2></div><button type="button" aria-label="Close" disabled={processing} onClick={()=>setShowConfirmation(false)}><X size={20}/></button></div><p className="mt-3 text-sm text-slate-600">{preview?.eligibleTenantCount ?? 0} eligible recipients · {channels.join(" + ")}</p><div className="mt-4 rounded-lg border border-slate-200 p-4"><h3 className="font-bold text-[#183B5B]">{form.title}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{form.message}</p><p className="mt-3 text-xs font-semibold text-slate-500">Priority: {form.priority}</p></div>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" disabled={processing} onClick={()=>setShowConfirmation(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button><button type="button" disabled={processing} onClick={confirmSend} className="inline-flex items-center gap-2 rounded-lg bg-[#183B5B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send size={16}/>{processing ? "Sending…" : "Confirm and send"}</button></div></section></motion.div>}
        {selectedAnnouncement && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-label="Delivery details" className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-[#B33A3A]">Delivery report</p><h2 className="mt-1 text-xl font-bold text-[#183B5B]">{selectedAnnouncement.title}</h2></div><button type="button" aria-label="Close" onClick={()=>{setSelectedAnnouncement(null);setDeliveries([]);}}><X size={20}/></button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[550px] text-left text-sm"><thead className="bg-[#F7F5EF] text-xs text-slate-500"><tr><th className="p-3">Resident</th><th className="p-3">Channel</th><th className="p-3">Outcome</th><th className="p-3">Details</th></tr></thead><tbody>{deliveries.map((d)=><tr key={d.deliveryId} className="border-t border-slate-200"><td className="p-3 font-semibold">{d.tenantName || d.email || "—"}</td><td className="p-3">{d.channel}</td><td className="p-3">{d.status}</td><td className="p-3 text-xs text-red-700">{d.failureReason || "—"}</td></tr>)}</tbody></table>{!deliveries.length && <p className="py-5 text-sm text-slate-500">No delivery records available.</p>}</div></section></motion.div>}
      </AnimatePresence>
    </main>
  );
}
