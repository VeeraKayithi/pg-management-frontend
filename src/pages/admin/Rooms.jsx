import { AnimatePresence } from "framer-motion";
import { NanduTableRow } from "../../components/admin/NanduAnimatedRow.jsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import {  Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import AdminHeader from "../../components/admin/AdminHeader.jsx";
import NanduAlert from "../../components/admin/NanduAlert.jsx";
import useAutoDismiss from "../../hooks/useAutoDismiss.js";
import NanduModal from "../../components/admin/NanduModal.jsx";
import NanduSelect from "../../components/admin/NanduSelect.jsx";
import { getAllBuildings } from "../../services/buildingService.js";
import { getAllRooms, createRoom, updateRoom, deleteRoom } from "../../services/roomService.js";
import { getAllTenants } from "../../services/tenantService.js";
import { getRole } from "../../services/authService.js";
import { buildOverview, idOf, roomAvailability, roomTypeLabel } from "../../utils/overviewMetrics.js";

const initialForm = { buildingId: "", roomNumber: "", sharingType: "DOUBLE", roomType: "NON_AC", roomStatus: "AVAILABLE" };
const sharingOptions = ["SINGLE", "DOUBLE", "TRIPLE", "FOUR"];
const statusOptions = ["AVAILABLE", "OCCUPIED", "UNDER_REPAIR", "BLOCKED"];
const fieldClass = "w-full min-h-11 rounded-lg border border-[#CDD8E3] bg-white px-3 text-sm text-[#183B5B] outline-none focus:border-[#183B5B] focus:ring-2 focus:ring-[#183B5B]/10";
const primaryClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#183B5B] px-4 text-sm font-semibold text-white hover:bg-[#102F4B] disabled:opacity-50";
const secondaryClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#183B5B] hover:bg-[#E8F0F7] disabled:opacity-50";

function getError(error, fallback) {
  const data = error?.response?.data;
  if (typeof data?.message === "string") return data.message;
  if (data && typeof data === "object") {
    const message = Object.values(data).find((value) => typeof value === "string");
    if (message) return message;
  }
  return error?.message || fallback;
}

function Status({ room }) {
  const status = roomAvailability(room);
  const color = status.tone === "available" ? "bg-emerald-50 text-emerald-800" : status.tone === "full" ? "bg-blue-50 text-blue-900" : status.tone === "unavailable" ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${color}`}>{status.label}</span>;
}

export default function Rooms() {
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  useAutoDismiss(error, useCallback(() => setError(""), []), 4000);
  useAutoDismiss(message, useCallback(() => setMessage(""), []), 4000);
  const role = String(getRole() || "").replace(/^ROLE_/i, "").toUpperCase();
  const canManage = role === "ADMIN" || role === "BUILDING_ADMIN";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [b, r, t] = await Promise.all([getAllBuildings(), getAllRooms(), getAllTenants()]);
      setBuildings(Array.isArray(b) ? b : []);
      setRooms(Array.isArray(r) ? r : []);
      setTenants(Array.isArray(t) ? t : []);
    } catch (e) {
      setError(getError(e, "Unable to load room inventory."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const overview = useMemo(() => buildOverview(buildings, rooms, tenants), [buildings, rooms, tenants]);
  const visible = useMemo(() => overview.rooms.filter((room) => {
    if (selectedBuilding && idOf(room.buildingId) !== idOf(selectedBuilding)) return false;
    const term = search.trim().toLowerCase();
    if (term && ![room.roomNumber, room.buildingName, ...room.residents.map((r) => r.name), ...room.residents.map((r) => r.mobileNumber)].some((v) => String(v ?? "").toLowerCase().includes(term))) return false;
    const state = roomAvailability(room).key;
    if (filter === "AVAILABLE") return state === "OPEN";
    if (filter === "FULL") return state === "FULL";
    if (filter === "UNAVAILABLE") return ["BLOCKED", "UNDER_REPAIR"].includes(state);
    return true;
  }), [overview.rooms, selectedBuilding, search, filter]);
  const selectedRoom = overview.rooms.find((room) => idOf(room.roomId) === idOf(selectedRoomId));
  const countAvailable = visible.reduce((sum, room) => sum + room.available, 0);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...initialForm, buildingId: selectedBuilding || buildings[0]?.buildingId || "" });
    setFormError("");
    setFormOpen(true);
  };
  const openEdit = (room) => {
    setEditingId(room.roomId);
    setForm({ buildingId: room.buildingId, roomNumber: room.roomNumber ?? "", sharingType: room.sharingType || "DOUBLE", roomType: room.roomType || "NON_AC", roomStatus: room.roomStatus || "AVAILABLE" });
    setFormError("");
    setFormOpen(true);
  };
  const save = async (event) => {
    event.preventDefault();
    const payload = { ...form, buildingId: Number(form.buildingId), roomNumber: String(form.roomNumber).trim() };
    if (!payload.buildingId || !payload.roomNumber) { setFormError("Building and room number are required."); return; }
    setSaving(true);
    setFormError("");
    try {
      if (editingId != null) await updateRoom(editingId, payload);
      else await createRoom(payload);
      setFormOpen(false);
      setMessage(editingId != null ? "Room updated successfully." : "Room created successfully.");
      await load();
    } catch (e) { setFormError(getError(e, "Unable to save room.")); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteRoom(deleteTarget.roomId);
      if (idOf(selectedRoomId) === idOf(deleteTarget.roomId)) setSelectedRoomId("");
      setDeleteTarget(null);
      setMessage("Room deleted successfully.");
      await load();
    } catch (e) { setError(getError(e, "Unable to delete room.")); setDeleteTarget(null); }
    finally { setSaving(false); }
  };

  return (
    <main className="min-h-screen bg-[var(--pg-bg)] px-4 py-5 text-[var(--pg-text)] sm:px-6 xl:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminHeader title="Rooms" subtitle="Inventory, configuration and room availability." />
        <section className="mt-6 overflow-hidden rounded-xl border border-[#D8E0E8] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E8EF] px-5 py-4">
            <div><h2 className="text-lg font-bold text-[#183B5B]">Room inventory</h2><p className="text-xs text-slate-500">{visible.length} rooms · {countAvailable} beds available in current view</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondaryClass} onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</button>
              {canManage && <button type="button" className={primaryClass} onClick={openAdd} disabled={!buildings.length}><Plus size={16} /> Add room</button>}
            </div>
          </div>
          <div className="grid gap-3 border-b border-[#E3E8EF] bg-[#F8FAFC] px-5 py-4 md:grid-cols-[1fr_220px]">
            <label className="relative block"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search room, building or resident" className={`${fieldClass} pl-10`} /></label>
            <NanduSelect placeholder="All buildings" value={selectedBuilding} options={[{ value: "", label: "All buildings" }, ...buildings.map((b) => ({ value: String(b.buildingId), label: b.buildingName }))]} onChange={(value) => { setSelectedBuilding(value); setSelectedRoomId(""); }} />
          </div>
          <div className="flex flex-wrap gap-2 border-b border-[#E3E8EF] px-5 py-3">
            {[ ["ALL", "All rooms"], ["AVAILABLE", "Beds available"], ["FULL", "Full"], ["UNAVAILABLE", "Blocked / repair"] ].map(([key, label]) => <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${filter === key ? "bg-[#183B5B] text-white" : "bg-[#EEF2F6] text-[#183B5B] hover:bg-[#DCE7F0]"}`}>{label}</button>)}
          </div>
          <NanduAlert type="error" message={error} onDismiss={() => setError("")} actionLabel="Retry" onAction={load} className="m-4" />
          <NanduAlert type="success" message={message} onDismiss={() => setMessage("")} className="m-4" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-[#EDF2F7] text-xs font-bold uppercase tracking-wide text-[#183B5B]"><tr>{["Room", "Building", "Configuration", "Occupied", "Beds free", "Status", "Action"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#EDF1F5]">
                <AnimatePresence initial={false}>

                {!loading && visible.map((room) => <NanduTableRow key={room.roomId} className="hover:bg-[#F5F8FB]">
                  <td className="px-4 py-3 font-bold text-[#183B5B]">{room.roomNumber}</td>
                  <td className="px-4 py-3">{room.buildingName || buildings.find((b) => idOf(b.buildingId) === idOf(room.buildingId))?.buildingName || "—"}</td>
                  <td className="px-4 py-3">{room.sharingType} · {roomTypeLabel(room.roomType)}</td>
                  <td className="px-4 py-3 tabular-nums">{room.occupied}/{room.capacity || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{room.unavailable ? "—" : room.available}</td>
                  <td className="px-4 py-3"><Status room={room} /></td>
                  <td className="px-4 py-3"><button type="button" className="font-semibold text-[#183B5B] underline-offset-4 hover:underline" onClick={() => setSelectedRoomId(idOf(room.roomId) === idOf(selectedRoomId) ? "" : room.roomId)}>{idOf(room.roomId) === idOf(selectedRoomId) ? "Close" : "Inspect →"}</button></td>
                </NanduTableRow>)}
                              </AnimatePresence>
              </tbody>
            </table>
            {loading && <div className="p-8 text-center text-sm text-slate-500">Loading rooms…</div>}
            {!loading && visible.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No rooms match these filters.</div>}
          </div>
        </section>
        {selectedRoom && <section className="mt-4 rounded-xl border border-[#D8E0E8] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Room details</p><h2 className="mt-1 text-xl font-bold text-[#183B5B]">Room {selectedRoom.roomNumber} <Status room={selectedRoom} /></h2><p className="mt-1 text-sm text-slate-500">{selectedRoom.buildingName} · {selectedRoom.sharingType} · {roomTypeLabel(selectedRoom.roomType)}</p></div><button type="button" className={secondaryClass} onClick={() => setSelectedRoomId("")}><X size={15} /> Close</button></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Capacity", selectedRoom.capacity], ["Active residents", selectedRoom.occupied], ["Beds available", selectedRoom.unavailable ? "Unavailable" : selectedRoom.available]].map(([label, value]) => <div key={label} className="rounded-lg bg-[#EDF2F7] p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-[#183B5B]">{value}</p></div>)}</div>
          <h3 className="mt-5 text-sm font-bold text-[#183B5B]">Assigned residents</h3><div className="mt-2 space-y-2">{selectedRoom.residents.length ? selectedRoom.residents.map((resident) => <div key={resident.tenantId} className="rounded-lg border border-[#E3E8EF] p-3 text-sm"><strong>{resident.name}</strong><span className="ml-3 text-slate-500">{resident.mobileNumber || ""}</span></div>) : <p className="text-sm text-slate-500">No active residents assigned.</p>}</div>
          {canManage && <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={primaryClass} onClick={() => openEdit(selectedRoom)}><Pencil size={15} /> Edit room</button><button type="button" className={secondaryClass} onClick={() => setDeleteTarget(selectedRoom)}><Trash2 size={15} /> Delete room</button></div>}
        </section>}
      </div>
      <NanduModal open={formOpen} onClose={() => setFormOpen(false)} disableClose={saving}
         ariaLabel={editingId != null ? "Edit room" : "Add room"} size="md"
         panelClassName="p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-[#183B5B]">{editingId != null ? "Edit room" : "Add room"}</h2><button type="button" aria-label="Close" onClick={() => !saving && setFormOpen(false)}><X size={20} /></button></div>
        <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">{[
          ["Building", "buildingId", buildings.map((b) => [b.buildingId, b.buildingName])],
          ["Sharing type", "sharingType", sharingOptions.map((v) => [v, v])],
          ["Room type", "roomType", [["AC", "AC"], ["NON_AC", "Non-AC"]]],
          ["Recorded status", "roomStatus", statusOptions.map((v) => [v, v.replaceAll("_", " ")])],
        ].map(([label, name, options]) => <NanduSelect key={name} label={`${label} *`} placeholder={name === "buildingId" ? "Select building" : `Select ${label.toLowerCase()}`} value={form[name]} options={[...(name === "buildingId" ? [{ value: "", label: "Select building" }] : []), ...options.map(([value, text]) => ({ value: String(value), label: text }))]} onChange={(value) => setForm((current) => ({ ...current, [name]: value }))} />)}
          <label className="block text-sm font-semibold text-[#183B5B] sm:col-span-2">Room number<input className={`mt-1 ${fieldClass}`} value={form.roomNumber} onChange={(e) => setForm((current) => ({ ...current, roomNumber: e.target.value }))} placeholder="For example, 101A" required /></label>
          {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{formError}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className={secondaryClass} disabled={saving} onClick={() => setFormOpen(false)}>Cancel</button><button type="submit" className={primaryClass} disabled={saving}>{saving ? "Saving…" : editingId != null ? "Save changes" : "Create room"}</button></div>
        </form></NanduModal>
      <NanduModal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} disableClose={saving}
         ariaLabel="Confirm room deletion" role="alertdialog" size="sm" zIndex={110}
         closeOnBackdrop={false} panelClassName="p-6"><h2 className="text-lg font-bold text-[#183B5B]">Delete room {deleteTarget?.roomNumber}?</h2><p className="mt-2 text-sm text-slate-600">This action removes the room record. The server will reject deletion if it is not permitted.</p><div className="mt-5 flex justify-end gap-2"><button className={secondaryClass} onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</button><button className="inline-flex min-h-10 items-center rounded-lg bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-50" disabled={saving} onClick={remove}>{saving ? "Deleting…" : "Delete room"}</button></div></NanduModal>
    </main>
  );
}
