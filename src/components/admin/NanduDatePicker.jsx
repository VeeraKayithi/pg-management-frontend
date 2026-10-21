import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import NanduSelect from "./NanduSelect.jsx";

const pad = (n) => String(n).padStart(2, "0");
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return toIso(date) === value ? date : null;
};
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i, label: new Date(2024, i, 1).toLocaleString("en-IN", { month: "long" }),
}));
const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** NANDU calendar: viewport-contained overlay, common date format YYYY-MM-DD. */
export default function NanduDatePicker({ label = "Date", value, onChange, disabled = false }) {
  const id = useId();
  const triggerRef = useRef(null);
  const calendarRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState({ top: 0, left: 0, width: 320, maxHeight: 310 });
  const [month, setMonth] = useState(() => {
    const date = fromIso(value) || new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const updatePlacement = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    // A form inside a modal has a scrollable content region above its footer.
    const scrollArea = trigger.closest('.overflow-y-auto');
    const bounds = scrollArea?.getBoundingClientRect();
    const margin = 8;
    const topLimit = Math.max(margin, bounds ? bounds.top + margin : margin);
    const bottomLimit = Math.min(window.innerHeight - margin, bounds ? bounds.bottom - margin : window.innerHeight - margin);
    const above = rect.top - topLimit - 6;
    const below = bottomLimit - rect.bottom - 6;
    const height = 314;
    const placeAbove = below < height && above > below;
    const available = Math.max(120, placeAbove ? above : below);
    const maxHeight = Math.min(height, available);
    const width = Math.min(340, Math.max(220, window.innerWidth - margin * 2));
    setPlacement({
      left: Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin)),
      top: placeAbove ? Math.max(topLimit, rect.top - maxHeight - 6) : Math.min(bottomLimit - maxHeight, rect.bottom + 6),
      width,
      maxHeight,
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    document.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      document.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const openCalendar = () => {
    if (disabled) return;
    const date = fromIso(value) || new Date();
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setOpen(true);
  };
  const setDate = (date) => {
    onChange(toIso(date));
    close();
  };
  const shiftMonth = (delta) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === "Escape") close();
    };
    const handlePointer = (event) => {
      // NanduSelect menus are rendered in document.body as portals.
      if (triggerRef.current?.contains(event.target) || calendarRef.current?.contains(event.target) || event.target.closest?.('[role="listbox"]')) return;
      close();
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointer);
    };
  }, [open]);

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = toIso(new Date());
  const selected = fromIso(value);
  const startYear = 1900;
  const endYear = Math.max(new Date().getFullYear() + 15, month.getFullYear());
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => ({ value: endYear - i, label: String(endYear - i) }));

  return (
    <div className="min-w-0">
      <div id={`${id}-label`} className="mb-1.5 text-xs font-semibold text-[#183B5B]">{label}</div>
      <button type="button" ref={triggerRef} disabled={disabled} onClick={() => open ? close() : openCalendar()}
        aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-[#CDD8E3] bg-white px-3.5 py-2.5 text-left text-sm text-[#183B5B] shadow-sm transition hover:border-[#7899B7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183B5B] disabled:opacity-50">
        <span id={`${id}-value`} className={selected ? "font-medium" : "text-slate-400"}>
          {selected ? value.split("-").reverse().join("-") : "Select date"}
        </span>
        <CalendarDays size={17} className="text-[#647B91]" />
      </button>
      {open && createPortal(
        <div ref={calendarRef} role="dialog" aria-label={`${label} calendar`}
          style={{ position: 'fixed', top: placement.top, left: placement.left, width: placement.width, maxHeight: placement.maxHeight }}
          className="z-[9000] overflow-y-auto rounded-xl border border-[#D7E2EB] bg-white p-2.5 shadow-[0_14px_35px_rgba(24,59,91,0.22)]">
            <div className="mb-2 grid grid-cols-[auto_minmax(0,1fr)_minmax(0,0.85fr)_auto] items-end gap-1.5">
              <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="mb-0.5 rounded-lg p-2 text-[#183B5B] hover:bg-[#E8F0F7]"><ChevronLeft size={17}/></button>
              <NanduSelect label="Month" value={month.getMonth()} options={months} onChange={v => setMonth(new Date(month.getFullYear(), Number(v), 1))} />
              <NanduSelect label="Year" value={month.getFullYear()} options={years} onChange={v => setMonth(new Date(Number(v), month.getMonth(), 1))} />
              <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="mb-0.5 rounded-lg p-2 text-[#183B5B] hover:bg-[#E8F0F7]"><ChevronRight size={17}/></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {weekdays.map(d => <span key={d} className="py-1 text-[11px] font-bold text-[#64748B]">{d}</span>)}
              {Array.from({length:firstDay}, (_,i) => <span key={`blank-${i}`} />)}
              {Array.from({length:days}, (_,i) => {
                const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
                const iso = toIso(date);
                return <button key={iso} type="button" onClick={() => setDate(date)} aria-pressed={iso === value}
                  aria-label={date.toLocaleDateString("en-IN", {day:"numeric",month:"long",year:"numeric"})}
                  className={`aspect-square min-h-7 rounded-lg text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#183B5B] ${iso === value ? "bg-[#183B5B] font-bold text-white" : iso === today ? "border border-[#7899B7] font-bold text-[#183B5B]" : "text-[#334E68] hover:bg-[#E8F0F7]"}`}>{i + 1}</button>;
              })}
            </div>
            <div className="mt-2 flex justify-between border-t border-[#E5EBF0] pt-2">
              <button type="button" onClick={() => setDate(new Date())} className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#183B5B] hover:bg-[#E8F0F7]">Today</button>
              <button type="button" onClick={close} className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:bg-[#E8F0F7]">Close</button>
            </div>
        </div>, document.body
      )}
    </div>
  );
}
