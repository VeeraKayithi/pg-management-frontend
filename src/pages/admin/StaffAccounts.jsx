import { AnimatePresence } from "framer-motion";
import { NanduTableRow } from "../../components/admin/NanduAnimatedRow.jsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, ShieldCheck, UserRound, X } from "lucide-react";
import AdminHeader from "../../components/admin/AdminHeader.jsx";
import NanduAlert from "../../components/admin/NanduAlert.jsx";
import useAutoDismiss from "../../hooks/useAutoDismiss.js";
import NanduModal from "../../components/admin/NanduModal.jsx";
import NanduSelect from "../../components/admin/NanduSelect.jsx";
import { getAllBuildings } from "../../services/buildingService.js";
import { createStaffAccount, getStaffAccounts, updateStaffAccountStatus } from "../../services/userService.js";
import { getRole } from "../../services/authService.js";

const EMPTY = { username: "", password: "", role: "BUILDING_ADMIN", buildingId: "" };
const ROLES = [
  { value: "BUILDING_ADMIN", label: "Building Admin" },
  { value: "SUPERVISOR", label: "Supervisor" },
];
const fieldStyle = "w-full min-h-11 rounded-lg border border-[#D9E3EA] bg-white px-3.5 py-2.5 text-sm text-[#183B5B] outline-none transition focus:border-[#183B5B] focus:ring-2 focus:ring-[#183B5B]/15";
const primaryStyle = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#183B5B] px-4 text-sm font-semibold text-white transition hover:bg-[#102F4B] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryStyle = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#D9E3EA] bg-white px-4 text-sm font-semibold text-[#183B5B] transition hover:bg-[#E8F0F7] disabled:opacity-50";
const errorText = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data?.message === "string") return data.message;
  if (data && typeof data === "object") {
    const messages = Object.values(data).filter((value) => typeof value === "string");
    if (messages.length) return messages.join(" ");
  }
  return fallback;
};
const roleName = (role) => role === "BUILDING_ADMIN" ? "Building Admin" : role === "SUPERVISOR" ? "Supervisor" : role || "—";

export default function StaffAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmAccount, setConfirmAccount] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  useAutoDismiss(error, useCallback(() => setError(""), []), 4000);
  useAutoDismiss(success, useCallback(() => setSuccess(""), []), 4000);
  const isAdmin = getRole()?.replace(/^ROLE_/i, "").toUpperCase() === "ADMIN";

  const loadData = useCallback(async (initial = false) => {
    if (initial) setLoading(true); else setRefreshing(true);
    try {
      const [staff, properties] = await Promise.all([getStaffAccounts(), getAllBuildings()]);
      setAccounts(Array.isArray(staff) ? staff : []);
      setBuildings(Array.isArray(properties) ? properties : []);
      setError("");
      return true;
    } catch (err) {
      setError(errorText(err, "Unable to load staff accounts. Please retry."));
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(true); }, [loadData]);

  const buildingOptions = useMemo(() => buildings.map((building) => ({
    value: building.buildingId,
    label: building.buildingName,
  })), [buildings]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return accounts.filter((account) => {
      const statusMatch = status === "ALL" || (status === "ACTIVE" ? account.active : !account.active);
      const textMatch = !term || [account.username, account.role, account.buildingName]
        .some((value) => String(value ?? "").toLowerCase().includes(term));
      return statusMatch && textMatch;
    });
  }, [accounts, search, status]);

  const openCreate = () => {
    setForm({ ...EMPTY, buildingId: buildings[0]?.buildingId ?? "" });
    setFormError("");
    setFormOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const payload = {
      username: form.username.trim(),
      password: form.password,
      role: form.role,
      buildingId: Number(form.buildingId),
    };
    if (!payload.username || !payload.password || !payload.buildingId) {
      setFormError("Please complete every required field.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await createStaffAccount(payload);
      setFormOpen(false);
      setForm(EMPTY);
      setSuccess("Staff account created successfully.");
      await loadData();
    } catch (err) {
      setFormError(errorText(err, "Unable to create staff account."));
    } finally { setSaving(false); }
  };

  const updateStatus = async () => {
    if (!confirmAccount || processingId !== null) return;
    const account = confirmAccount;
    const next = !account.active;
    setProcessingId(account.userId);
    setConfirmError("");
    try {
      await updateStaffAccountStatus(account.userId, next);
      setAccounts((list) => list.map((entry) => entry.userId === account.userId ? { ...entry, active: next } : entry));
      setConfirmAccount(null);
      setSuccess(`Account ${next ? "activated" : "deactivated"} successfully.`);
    } catch (err) {
      setConfirmError(errorText(err, "Unable to update account status."));
    } finally { setProcessingId(null); }
  };

  return (
    <main className="min-h-screen bg-[var(--pg-bg)] px-4 py-5 text-[var(--pg-text)] sm:px-6 sm:py-7 xl:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminHeader title="Staff Accounts" subtitle="Manage building administrators and supervisors." />
        {!isAdmin ? (
          <div role="alert" className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Only Super Admin can manage staff accounts.</div>
        ) : (
          <>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#B33A3A]">Access management</p>
                <h2 className="mt-1 text-xl font-bold text-[#183B5B]">Staff directory <span className="text-base font-medium text-[#64748B]">({accounts.length})</span></h2>
              </div>
              <button type="button" onClick={openCreate} disabled={loading || !buildings.length} className={primaryStyle}><Plus size={17} /> Add staff account</button>
            </div>

            <NanduAlert type="error" message={error} onDismiss={() => setError("")} actionLabel="Retry" onAction={() => loadData()} className="mt-4" />
            <NanduAlert type="success" message={success} onDismiss={() => setSuccess("")} className="mt-4" />

            <section className="mt-4 overflow-visible rounded-xl border border-[#D9E3EA] bg-white shadow-[0_3px_12px_rgba(24,59,91,0.035)]">
              <div className="flex flex-col gap-3 border-b border-[#E4EBF0] p-4 md:flex-row md:items-end md:justify-between">
                <label className="relative block w-full md:max-w-sm">
                  <span className="mb-1.5 block text-xs font-semibold text-[#64748B]">Search staff</span>
                  <Search size={17} className="pointer-events-none absolute bottom-3 left-3 text-[#7A93A8]"/>
                  <input className={`${fieldStyle} pl-10`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Username or assigned building" />
                </label>
                <div role="group" aria-label="Filter by account status" className="flex flex-wrap gap-2">
                  {[["ALL", "All"], ["ACTIVE", "Active"], ["INACTIVE", "Inactive"]].map(([key, label]) => <button key={key} type="button" onClick={() => setStatus(key)} aria-pressed={status === key} className={`min-h-10 rounded-lg border px-4 text-sm font-semibold ${status === key ? "border-[#183B5B] bg-[#183B5B] text-white" : "border-[#D9E3EA] bg-white text-[#183B5B] hover:bg-[#E8F0F7]"}`}>{label}</button>)}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead className="bg-[#E8F0F7] text-[11px] font-bold uppercase tracking-wider text-[#183B5B]"><tr><th className="px-4 py-3">Username</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Assigned building</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
                  <tbody className="divide-y divide-[#E4EBF0]">
                <AnimatePresence initial={false}>

                    {loading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-[#64748B]">Loading staff accounts…</td></tr> : visible.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-[#64748B]">{accounts.length === 0 ? "No staff accounts yet." : "No accounts match your filters."}</td></tr> : visible.map((account) => <NanduTableRow key={account.userId} className="hover:bg-[#F7FAFC]"><td className="px-4 py-3 font-semibold text-[#183B5B]"><span className="inline-flex items-center gap-2"><UserRound size={16} className="text-[#63839A]"/>{account.username}</span></td><td className="px-4 py-3">{roleName(account.role)}</td><td className="px-4 py-3">{account.buildingName || `Building #${account.buildingId}`}</td><td className="px-4 py-3"><span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${account.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{account.active ? "Active" : "Inactive"}</span></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => { setConfirmError(""); setConfirmAccount(account); }} className="text-xs font-bold text-[#183B5B] underline-offset-4 hover:underline">{account.active ? "Deactivate" : "Activate"} →</button></td></NanduTableRow>)}
                                  </AnimatePresence>
              </tbody>
                </table>
              </div>
              {refreshing && <p className="border-t border-[#E4EBF0] px-4 py-2 text-xs text-[#64748B]">Refreshing records…</p>}
            </section>
          </>
        )}
      </div>

      <NanduModal open={formOpen && isAdmin} onClose={() => setFormOpen(false)} disableClose={saving}
        titleId="staff-form-title" size="md">
          <div className="flex items-start justify-between gap-4 border-b border-[#E4EBF0] px-5 py-4 sm:px-6"><div><p className="text-[11px] font-bold uppercase tracking-wider text-[#B33A3A]">Access management</p><h2 id="staff-form-title" className="mt-1 text-xl font-bold text-[#183B5B]">Add staff account</h2></div><button type="button" onClick={() => setFormOpen(false)} disabled={saving} aria-label="Close staff form" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D9E3EA] text-[#183B5B] hover:bg-[#E8F0F7] disabled:opacity-50"><X size={19}/></button></div>
          <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
            {formError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{formError}</p>}
            <div><label htmlFor="staff-username" className="mb-1.5 block text-sm font-semibold text-[#183B5B]">Username *</label><input id="staff-username" required autoComplete="off" className={fieldStyle} value={form.username} onChange={(e) => setForm((old) => ({ ...old, username: e.target.value }))} /></div>
            <div><label htmlFor="staff-password" className="mb-1.5 block text-sm font-semibold text-[#183B5B]">Password *</label><input id="staff-password" type="password" required autoComplete="new-password" className={fieldStyle} value={form.password} onChange={(e) => setForm((old) => ({ ...old, password: e.target.value }))} /></div>
            <NanduSelect label="Role *" value={form.role} options={ROLES} onChange={(value) => setForm((old) => ({ ...old, role: value }))} />
            <NanduSelect label="Assigned building *" value={form.buildingId} options={buildingOptions} placeholder="Select building" onChange={(value) => setForm((old) => ({ ...old, buildingId: value }))} />
            <div className="flex items-start gap-2 rounded-lg bg-[#E8F0F7] p-3 text-xs leading-relaxed text-[#33536C]"><ShieldCheck size={17} className="mt-0.5 shrink-0"/>Building Admin can manage the assigned property. Supervisor has read-only access to its management data.</div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[#E4EBF0] pt-4"><button type="button" onClick={() => setFormOpen(false)} disabled={saving} className={secondaryStyle}>Cancel</button><button type="submit" disabled={saving} className={primaryStyle}>{saving ? "Creating…" : <><Plus size={16}/> Create account</>}</button></div>
          </form>
      </NanduModal>

      <NanduModal open={Boolean(confirmAccount) && isAdmin} onClose={() => setConfirmAccount(null)}
        disableClose={processingId !== null} titleId="staff-confirm-title" role="alertdialog"
        size="sm" zIndex={110} panelClassName="p-5 sm:p-6"><div className="flex items-start justify-between gap-2"><h2 id="staff-confirm-title" className="text-xl font-bold text-[#183B5B]">{confirmAccount?.active ? "Deactivate" : "Activate"} account?</h2><button type="button" aria-label="Close confirmation" disabled={processingId !== null} onClick={() => setConfirmAccount(null)} className="rounded-lg p-2 text-[#183B5B] hover:bg-[#E8F0F7]"><X size={19}/></button></div><p className="mt-3 text-sm leading-relaxed text-[#64748B]"><strong className="text-[#183B5B]">{confirmAccount?.username}</strong> · {roleName(confirmAccount?.role)} · {confirmAccount?.buildingName || `Building #${confirmAccount?.buildingId}`}</p><p className="mt-2 text-sm text-[#64748B]">{confirmAccount?.active ? "This user will no longer be able to access their account." : "This user will regain access under their existing role and building assignment."}</p>{confirmError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{confirmError}</p>}<div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setConfirmAccount(null)} disabled={processingId !== null} className={secondaryStyle}>Cancel</button><button type="button" onClick={updateStatus} disabled={processingId !== null} className={confirmAccount?.active ? "inline-flex min-h-10 items-center rounded-lg bg-[#B33A3A] px-4 text-sm font-semibold text-white hover:bg-[#922D2D] disabled:opacity-50" : primaryStyle}>{processingId !== null ? "Updating…" : `Confirm ${confirmAccount?.active ? "deactivation" : "activation"}`}</button></div></NanduModal>
    </main>
  );
}
