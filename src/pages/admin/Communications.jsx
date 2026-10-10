import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AdminHeader from "../../components/admin/AdminHeader.jsx";
import ActionButton from "../../components/admin/ActionButton.jsx";
import PremiumSelect from "../../components/admin/PremiumSelect.jsx";
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
    <main className="min-h-screen bg-[#F5F5F0] px-4 py-6 text-stone-900 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <AdminHeader
          title="Communication Center"
          subtitle="Send one operational announcement to every eligible active Tenant."
        />

        {(error || success) && (
          <div className={`mt-5 rounded-2xl border p-4 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {error || success}
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">New Communication</p>
            <h2 className="mt-2 text-3xl font-black tracking-tighter">Create announcement</h2>

            <form onSubmit={requestSend} className="mt-7 space-y-5">
              <label className="block">
                <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-stone-500">Title</span>
                <input
                  value={form.title}
                  maxLength={150}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Scheduled water maintenance"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-sm outline-none transition focus:border-stone-700 focus:bg-white focus:ring-4 focus:ring-stone-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-stone-500">Message</span>
                <textarea
                  value={form.message}
                  maxLength={2000}
                  rows={7}
                  onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Write the operational update for all active Tenants..."
                  className="w-full resize-y rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-sm leading-relaxed outline-none transition focus:border-stone-700 focus:bg-white focus:ring-4 focus:ring-stone-100"
                />
                <span className="mt-2 block text-right text-xs text-stone-400">{form.message.length}/2000</span>
              </label>

              <PremiumSelect
                label="Priority"
                value={form.priority}
                options={priorityOptions}
                onChange={(value) => setForm((current) => ({ ...current, priority: value }))}
              />

              <div>
                <p className="mb-3 text-[9px] font-bold uppercase tracking-widest text-stone-500">Delivery channels</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["inApp", "In-App Notification", "Appears in the Tenant notification center."],
                    ["email", "Email", "Uses the reusable Nandu PG email template."],
                  ].map(([key, label, description]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, [key]: !current[key] }))}
                      className={`rounded-2xl border p-4 text-left transition ${form[key] ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-stone-50 text-stone-800 hover:border-stone-400"}`}
                    >
                      <span className="text-sm font-black">{label}</span>
                      <span className={`mt-1 block text-xs leading-relaxed ${form[key] ? "text-stone-300" : "text-stone-500"}`}>{description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <ActionButton type="submit" variant="primary" className="w-full sm:w-auto">
                Review Announcement
              </ActionButton>
            </form>
          </motion.section>

          <section className="space-y-6">
            <div className="rounded-[2rem] border border-stone-200 bg-stone-900 p-6 text-white shadow-sm sm:p-8">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">Recipient Preview</p>
              <h2 className="mt-2 text-3xl font-black tracking-tighter">Eligible portal Tenants</h2>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ["Active Tenants", preview?.activeTenantCount ?? 0],
                  ["Eligible Tenants", preview?.eligibleTenantCount ?? 0],
                  ["In-App Eligible", preview?.inAppEligibleCount ?? 0],
                  ["Without Portal", preview?.tenantsWithoutPortalAccount ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/10 p-4">
                    <p className="text-2xl font-black">{value}</p>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-stone-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">Delivery Rules</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-stone-600">
                <li>Only Tenants with status ACTIVE are considered.</li>
                <li>Tenants without a portal account are excluded.</li>
                <li>In-app delivery requires an active linked portal account.</li>
                <li>Email delivery requires an active account and verified email.</li>
                <li>One failed delivery does not stop other recipients.</li>
              </ul>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">Communication History</p>
              <h2 className="mt-2 text-3xl font-black tracking-tighter">Recent announcements</h2>
            </div>
            <ActionButton onClick={loadHistory}>Refresh</ActionButton>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="h-32 animate-pulse rounded-2xl bg-stone-100" />
            ) : history.length === 0 ? (
              <p className="rounded-2xl bg-stone-50 p-8 text-center text-sm text-stone-500">No announcements have been sent yet.</p>
            ) : history.map((item) => (
              <motion.article layout key={item.announcementId} className="rounded-2xl border border-stone-200 p-5 hover:shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-[7px] font-bold uppercase tracking-widest">{item.priority}</span>
                      <span className="rounded-full bg-stone-900 px-3 py-1 text-[7px] font-bold uppercase tracking-widest text-white">{item.status}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-black">{item.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-stone-600">{item.message}</p>
                    <p className="mt-3 text-xs text-stone-400">{formatDate(item.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold">{item.sentCount} sent · {item.failedCount} failed · {item.skippedCount} skipped</p>
                    <ActionButton className="mt-3" onClick={() => showDeliveries(item)}>Delivery Report</ActionButton>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-950/45 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{
                opacity: 0,
                y: 18,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 12,
                scale: 0.98,
              }}
              transition={{
                duration: 0.22,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="w-full max-w-xl rounded-[2rem] bg-white p-7 shadow-2xl"
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">
                Final Review
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-tighter">
                Send to {preview?.eligibleTenantCount ?? 0} eligible Tenants?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                {preview?.activeTenantCount ?? 0} active Tenant records were found.{" "}
                {preview?.tenantsWithoutPortalAccount ?? 0} do not have a portal
                account and will be skipped.
              </p>

              <div className="mt-5 rounded-2xl bg-stone-50 p-5">
                <p className="font-black">
                  {form.title}
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
                  {form.message}
                </p>

                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-stone-400">
                  {form.priority} · {channels.join(" + ")}
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <ActionButton
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  disabled={processing}
                >
                  Cancel
                </ActionButton>

                <ActionButton
                  type="button"
                  variant="primary"
                  onClick={confirmSend}
                  disabled={processing}
                >
                  {processing
                    ? "Sending..."
                    : "Send Announcement"}
                </ActionButton>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedAnnouncement && (
          <motion.div className="fixed inset-0 z-[210] flex items-center justify-center bg-stone-950/45 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-7 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">Delivery Report</p>
                  <h2 className="mt-2 text-2xl font-black">{selectedAnnouncement.title}</h2>
                </div>
                <ActionButton onClick={() => { setSelectedAnnouncement(null); setDeliveries([]); }}>Close</ActionButton>
              </div>
              <div className="mt-6 space-y-2">
                {deliveries.map((delivery) => (
                  <div key={delivery.deliveryId} className="grid gap-2 rounded-2xl border border-stone-200 p-4 sm:grid-cols-[1fr_120px_120px] sm:items-center">
                    <div>
                      <p className="font-bold">{delivery.tenantName}</p>
                      <p className="text-xs text-stone-500">{delivery.email}</p>
                      {delivery.failureReason && <p className="mt-1 text-xs text-rose-600">{delivery.failureReason}</p>}
                    </div>
                    <span className="text-xs font-bold">{delivery.channel}</span>
                    <span className={`text-xs font-black ${delivery.status === "SENT" ? "text-emerald-600" : delivery.status === "FAILED" ? "text-rose-600" : "text-stone-500"}`}>{delivery.status}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
