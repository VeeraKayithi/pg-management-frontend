import { useEffect, useRef, useState } from "react";
import { ArrowRight, Clock3, History, X } from "lucide-react";
import { getTenantStayHistory } from "../../services/tenantService.js";

function formatDate(date) {
  if (!date) return "Not recorded";
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}
export default function TenantStayHistoryModal({ tenant, onClose }) {
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const closeRef = useRef(null);

  useEffect(() => {
    let active = true;
    getTenantStayHistory(tenant.tenantId)
      .then(data => { if (active) setStays(Array.isArray(data) ? data : []); })
      .catch(e => { if (active) setError(e.response?.data?.message || "Unable to load stay history."); })
      .finally(() => { if (active) setLoading(false); });
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = event => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const elements = document.querySelectorAll('[data-stay-dialog] button:not(:disabled)');
        if (elements.length === 1) { event.preventDefault(); closeRef.current?.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      active = false;
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [tenant.tenantId, onClose]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#0E253C]/60 p-3 sm:p-6"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section data-stay-dialog role="dialog" aria-modal="true" aria-labelledby="stay-history-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#D9E3EA] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#D9E3EA] p-5 sm:px-6">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#52718D]"><History size={15}/> Resident timeline</p>
            <h2 id="stay-history-title" className="mt-1 text-xl font-bold text-[#183B5B]">{tenant.name} — Stay history</h2>
            <p className="mt-1 text-xs text-[#64748B]">Historical admissions and recorded room transfers</p>
          </div>
          <button ref={closeRef} onClick={onClose} type="button" aria-label="Close stay history"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D9E3EA] text-[#183B5B] hover:bg-[#E8F0F7]"><X size={19}/></button>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F6F9FC] p-5 sm:p-6">
          {loading && <p className="text-sm text-[#64748B]">Loading stay history…</p>}
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {!loading && !error && stays.length === 0 && <p className="text-sm text-[#64748B]">No accessible stay records found.</p>}
          {stays.map(stay => (
            <article key={stay.stayId} className="rounded-xl border border-[#D9E3EA] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-[#183B5B]">{stay.buildingName} · Room {stay.roomNumber}</p>
                <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${stay.status === "ACTIVE" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{stay.status === "ACTIVE" ? "Active" : "Completed"}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                <Clock3 size={14}/> Joined {formatDate(stay.joiningDate)}
                <ArrowRight size={13}/>
                {stay.status === "ACTIVE" ? "Present" : stay.departureDateUnknown ? "Departure date not recorded" : `Left ${formatDate(stay.leavingDate)}`}
              </div>
              {stay.transfers?.length > 0 && <div className="mt-4 border-t border-[#E5EBF0] pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#52718D]">Room transfers</p>
                <div className="space-y-2">{stay.transfers.map(t => (
                  <div key={t.transferId} className="flex flex-wrap items-center gap-2 text-xs text-[#475569]">
                    <span>Room {t.fromRoom}</span><ArrowRight size={14}/><span>Room {t.toRoom}</span>
                    <span className="ml-auto text-[#64748B]">{t.transferredAt ? new Date(t.transferredAt).toLocaleString("en-IN") : "Time unknown"}</span>
                  </div>
                ))}</div>
              </div>}
            </article>
          ))}
        </div>
        <footer className="flex justify-end border-t border-[#D9E3EA] bg-white px-5 py-4">
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg bg-[#183B5B] px-5 text-sm font-semibold text-white hover:bg-[#102F4B]">Close</button>
        </footer>
      </section>
    </div>
  );
}
