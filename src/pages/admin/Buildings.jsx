import { AnimatePresence } from "framer-motion";
import { NanduListRow, NanduTableRow } from "../../components/admin/NanduAnimatedRow.jsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, LoaderCircle, Plus, RefreshCw, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminHeader from "../../components/admin/AdminHeader.jsx";
import NanduSelect from "../../components/admin/NanduSelect.jsx";
import { createBuilding, deleteBuilding, getAllBuildings, updateBuilding } from "../../services/buildingService.js";
import { getRole } from "../../services/authService.js";
import { getAllRooms } from "../../services/roomService.js";
import NanduModal from "../../components/admin/NanduModal.jsx";
import NanduButton from "../../components/admin/NanduButton.jsx";
import NanduAlert from "../../components/admin/NanduAlert.jsx";
import useAutoDismiss from "../../hooks/useAutoDismiss.js";

const EMPTY = { buildingName: "", buildingType: "MENS_PG", address: "", city: "Hyderabad" };
const fieldClass = "w-full rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] px-3 py-2.5 text-sm text-[var(--pg-text)] outline-none focus:border-[#183B5B] focus:ring-2 focus:ring-[#183B5B]/10";
const typeLabel = (t) => t === "MENS_PG" ? "Men's PG" : t === "WOMENS_PG" ? "Women's PG" : t || "—";
function messageOf(error, fallback) {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data?.message === "string") return data.message;
  if (data && typeof data === "object") {
    const issues = Object.values(data).filter((x) => typeof x === "string");
    if (issues.length) return issues.join(" ");
  }
  return fallback;
}

export default function Buildings() {
  const navigate = useNavigate();
  const role = (getRole() || "").replace(/^ROLE_/i, "").toUpperCase();
  const isAdmin = role === "ADMIN";
  const mayEdit = isAdmin || role === "BUILDING_ADMIN";
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(null);
  const [modalBuilding, setModalBuilding] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [result, roomData] = await Promise.all([getAllBuildings(), getAllRooms()]);
      setBuildings(Array.isArray(result) ? result : []);
      setRooms(Array.isArray(roomData) ? roomData : []);
      setLoaded(true);
    } catch (err) {
      setError(messageOf(err, "Unable to load buildings."));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useAutoDismiss(
    success,
    useCallback(() => setSuccess(""), []),
    4000
  );

  useAutoDismiss(
    error,
    useCallback(() => setError(""), []),
    4000
  );
  const visible = useMemo(() => buildings.filter((b) =>
    `${b.buildingName || ""} ${b.city || ""} ${b.address || ""}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [buildings, search]);

  const openCreate = () => { setForm({ ...EMPTY }); setModalBuilding({}); setEditing({}); setFormError(""); setSuccess(""); };
  const openEdit = (b) => {
    if (!mayEdit) return;
    setModalBuilding(b);
    setEditing(b);
    setForm({ buildingName: b.buildingName || "", buildingType: b.buildingType || "MENS_PG", address: b.address || "", city: b.city || "Hyderabad" });
    setFormError(""); setSuccess("");
  };
  const save = async (event) => {
    event.preventDefault();
    const payload = { ...form, buildingName: form.buildingName.trim(), address: form.address.trim(), city: form.city.trim() };
    if (!payload.buildingName || !payload.address || !payload.city) { setFormError("Complete all required fields."); return; }
    setSaving(true); setFormError("");
    try {
      if (editing?.buildingId != null) await updateBuilding(editing.buildingId, payload);
      else await createBuilding(payload);
      setEditing(null);
      await load();
      setSuccess("Building saved successfully.");
    } catch (err) { setFormError(messageOf(err, "Unable to save building.")); }
    finally { setSaving(false); }
  };
  const askDelete = (b) => { setDeleting(b); setDeleteError(""); };
  const confirmDelete = async () => {
    if (!deleting || !isAdmin) return;
    setDeleteBusy(true); setDeleteError("");
    try {
      await deleteBuilding(deleting.buildingId);
      setDeleting(null); await load(); setSuccess("Building deleted.");
    } catch (err) { setDeleteError(messageOf(err, "Unable to delete building.")); }
    finally { setDeleteBusy(false); }


  };

  return (
    <main className="min-h-screen bg-[var(--pg-bg)] px-4 py-6 text-[var(--pg-text)] sm:px-6 xl:px-8">

      <div className="mx-auto max-w-7xl">
        <AdminHeader title="Buildings" subtitle="Manage authorized properties and building details." />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex w-full max-w-md items-center gap-2 rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] px-3 focus-within:border-[#183B5B]">
            <Search size={17} className="text-[var(--pg-text-muted)]" />
            <input
              className="nandu-search-input min-h-11 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-[var(--pg-text-muted)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search building name or city"
              aria-label="Search buildings"
            />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={load} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--pg-border)] bg-[var(--pg-surface)] px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
            {isAdmin && <NanduButton type="button" onClick={openCreate} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#183B5B] px-4 text-sm font-semibold text-white hover:bg-[#102F4B]"><Plus size={16} /> Add building</NanduButton>}

          </div>
        </div>
        <NanduAlert
          type="error"
          message={error}
          onDismiss={() => setError("")}
          className="mt-4"
        />
        <NanduAlert
          type="success"
          message={success}
          onDismiss={() => setSuccess("")}
          className="mt-4"
        />
        <section className="mt-4 overflow-hidden rounded-xl border border-[var(--pg-border)] bg-[var(--pg-surface)]">
          <div className="border-b border-[var(--pg-border)] px-5 py-3 text-sm font-bold text-[var(--pg-heading)]">Registered properties {loaded && <span className="ml-2 text-xs font-normal text-[var(--pg-text-muted)]">{visible.length} shown</span>}</div>
          <div className="hidden grid-cols-[minmax(0,2fr)_minmax(125px,1fr)_minmax(75px,.55fr)_minmax(100px,.7fr)] gap-3 border-b border-[var(--pg-border)] bg-[var(--pg-surface-soft)]/50 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--pg-text-muted)] md:grid">
            <span>Building</span><span>Classification</span><span>Rooms</span><span>Action</span>
          </div>
          {loading && !loaded ? <div className="flex items-center gap-2 p-6 text-sm text-[var(--pg-text-muted)]"><LoaderCircle className="animate-spin" size={18} /> Loading properties...</div> : visible.length === 0 ? <div className="p-8 text-center text-sm text-[var(--pg-text-muted)]">{search ? "No buildings match your search." : "No buildings available to your account."}</div> : <AnimatePresence initial={false}>{visible.map((b) => (
            <NanduListRow key={b.buildingId} className="grid gap-3 border-b border-[var(--pg-border)] px-5 py-4 last:border-0 md:grid-cols-[minmax(0,2fr)_minmax(125px,1fr)_minmax(75px,.55fr)_minmax(100px,.7fr)] md:items-center">
              <div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--pg-surface-soft)] text-[#183B5B]"><Building2 size={19} /></span><div className="min-w-0"><p className="font-bold text-[var(--pg-heading)]">{b.buildingName}</p><p className="mt-1 break-words text-xs text-[var(--pg-text-muted)]">{[b.address, b.city].filter(Boolean).join(", ") || "Address not provided"}</p></div></div>
              <div className="text-sm"><span className="rounded-full bg-[var(--pg-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--pg-heading)]">{typeLabel(b.buildingType)}</span></div>
              <span className="text-sm text-[var(--pg-text-muted)]">{rooms.filter((r) => String(r.buildingId) === String(b.buildingId)).length}</span>
              <button type="button" onClick={() => mayEdit ? openEdit(b) : navigate("/admin/rooms")} className="inline-flex w-fit items-center gap-1 text-sm font-bold text-[#183B5B] hover:underline">{mayEdit ? "View / edit" : "View rooms"}<ArrowRight size={15} /></button>
            </NanduListRow>
          ))}</AnimatePresence>}
        </section>
        <p className="mt-4 text-xs leading-5 text-[var(--pg-text-muted)]">Building admins may edit only their assigned property. Supervisors have read-only access. Building deletion is subject to server checks and is blocked when rooms are registered.</p>
      </div>

      <NanduModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        disableClose={saving}
        titleId="building-form-title"
        size="md"
        zIndex={100}
        panelClassName="rounded-2xl"
      >
        <div className="p-5 sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="building-form-title" className="text-xl font-black text-[var(--pg-heading)]">
                {modalBuilding?.buildingId != null ? "Edit building" : "Add building"}
              </h2>
              <p className="mt-1 text-sm text-[var(--pg-text-muted)]">Update authorized building details.</p>
            </div>
            <button type="button" aria-label="Close" disabled={saving} onClick={() => setEditing(null)}>
              <X size={20} />
            </button>
          </div>
          <form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-[var(--pg-heading)]">
              Building name *
              <input autoFocus required name="buildingName" value={form.buildingName}
                onChange={(e) => setForm((f) => ({ ...f, buildingName: e.target.value }))}
                className={`mt-2 ${fieldClass}`} />
            </label>
            <NanduSelect label="Classification *" value={form.buildingType}
              options={[{ value: "MENS_PG", label: "Men's PG" }, { value: "WOMENS_PG", label: "Women's PG" }]}
              onChange={(value) => setForm((f) => ({ ...f, buildingType: value }))} />
            <label className="text-xs font-bold text-[var(--pg-heading)]">
              Address *
              <textarea required rows={3} value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className={`mt-2 ${fieldClass}`} />
            </label>
            <label className="text-xs font-bold text-[var(--pg-heading)]">
              City *
              <input required value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className={`mt-2 ${fieldClass}`} />
            </label>
            {formError && <p role="alert" className="sm:col-span-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{formError}</p>}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button type="submit" disabled={saving}
                className="min-h-11 rounded-lg bg-[#183B5B] px-5 text-sm font-bold text-white disabled:opacity-50">
                {saving ? "Saving..." : modalBuilding?.buildingId != null ? "Save changes" : "Create building"}
              </button>
              <button type="button" disabled={saving} onClick={() => setEditing(null)}
                className="min-h-11 rounded-lg border border-[var(--pg-border)] px-5 text-sm font-semibold">
                Cancel
              </button>
              {isAdmin && modalBuilding?.buildingId != null && (
                <button type="button" disabled={saving}
                  onClick={() => { const current = modalBuilding; setEditing(null); askDelete(current); }}
                  className="ml-auto min-h-11 text-sm font-semibold text-rose-700">
                  Delete building
                </button>
              )}
            </div>
          </form>
        </div>
      </NanduModal>

      <NanduModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        disableClose={deleteBusy}
        titleId="delete-title"
        size="sm"
        zIndex={110}
        role="alertdialog"
        closeOnBackdrop={false}
        panelClassName="rounded-2xl"
      >
        <div className="p-6">
          <h2 id="delete-title" className="text-xl font-black text-[var(--pg-heading)]">Delete building?</h2>
          <p className="mt-3 text-sm text-[var(--pg-text-muted)]">
            Delete <strong>{deleting?.buildingName}</strong>? The backend will reject deletion if rooms are registered.
          </p>
          {deleteError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{deleteError}</p>}
          <div className="mt-5 flex gap-2">
            <button disabled={deleteBusy} onClick={confirmDelete}
              className="min-h-11 rounded-lg bg-rose-700 px-5 text-sm font-bold text-white disabled:opacity-50">
              {deleteBusy ? "Deleting..." : "Delete building"}
            </button>
            <button disabled={deleteBusy} onClick={() => setDeleting(null)}
              className="min-h-11 rounded-lg border border-[var(--pg-border)] px-5 text-sm font-semibold">
              Cancel
            </button>
          </div>
        </div>
      </NanduModal>
    </main>
  );
}
