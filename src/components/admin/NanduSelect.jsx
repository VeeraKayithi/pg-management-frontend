import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/** Consistent, keyboard-accessible dropdown for NANDU management forms. */
export default function NanduSelect({
  value,
  onChange,
  options = [],
  label,
  placeholder = "Select an option",
  disabled = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);
  const id = useId();
  const selectedIndex = options.findIndex((item) => String(item.value) === String(value ?? ""));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[active]?.scrollIntoView?.({ block: "nearest" });
  }, [active, open]);

  const show = () => {
    if (disabled || !options.length) return;
    setActive(Math.max(selectedIndex, 0));
    setOpen(true);
  };

  const choose = (index) => {
    if (!options[index] || options[index].disabled) return;
    onChange(options[index].value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const move = (start, direction) => {
    for (let n = 0; n < options.length; n++) {
      const index = (start + direction * (n + 1) + options.length * 2) % options.length;
      if (!options[index].disabled) return index;
    }
    return start;
  };

  const onKeyDown = (event) => {
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape", "Tab"].includes(event.key)) {
      if (event.key === "Tab") { setOpen(false); return; }
      if (event.key === "Escape") { setOpen(false); return; }
      event.preventDefault();
      if (!open) { show(); return; }
      if (event.key === "ArrowDown") setActive((i) => move(i, 1));
      if (event.key === "ArrowUp") setActive((i) => move(i, -1));
      if (event.key === "Home") setActive(move(options.length - 1, 1));
      if (event.key === "End") setActive(move(0, -1));
      if (event.key === "Enter" || event.key === " ") choose(active);
    }
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      {label && <div id={`${id}-label`} className="mb-1.5 text-xs font-semibold text-[#183B5B]">{label}</div>}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={!label ? placeholder : undefined}
        aria-labelledby={label ? `${id}-label ${id}-value` : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-options` : undefined}
        onKeyDown={onKeyDown}
        onClick={() => open ? setOpen(false) : show()}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3.5 py-2.5 text-left text-sm shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183B5B] disabled:cursor-not-allowed disabled:opacity-50 ${open ? "border-[#183B5B] ring-2 ring-[#183B5B]/10" : "border-[#CDD8E3] hover:border-[#7899B7]"}`}
      >
        <span id={`${id}-value`} className={`min-w-0 flex-1 truncate ${selected ? "font-medium text-[#183B5B]" : "text-slate-400"}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-[#647B91] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={`${id}-options`} role="listbox" aria-labelledby={label ? `${id}-label` : undefined}
          className="absolute left-0 right-0 top-full z-[200] mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-[#D7E2EB] bg-white p-1.5 shadow-[0_14px_35px_rgba(24,59,91,0.18)]">
          {options.map((item, index) => {
            const checked = String(item.value) === String(value ?? "");
            return (
              <button key={String(item.value)} ref={(node) => { optionRefs.current[index] = node; }}
                role="option" aria-selected={checked} type="button" disabled={item.disabled}
                onMouseEnter={() => setActive(index)} onClick={() => choose(index)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition disabled:opacity-40 ${index === active ? "bg-[#E8F0F7] text-[#183B5B]" : "text-[#334E68]"} ${checked ? "font-bold" : "font-medium"}`}>
                <span className="truncate">{item.label}</span>
                {checked && <Check size={15} className="shrink-0 text-[#183B5B]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
