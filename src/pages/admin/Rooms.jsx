import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";

import AdminHeader from "../../components/admin/AdminHeader.jsx";
import ActionButton from "../../components/admin/ActionButton.jsx";
import PremiumSelect from "../../components/admin/PremiumSelect.jsx";
import { getAllBuildings } from "../../services/buildingService.js";
import { createRoom, deleteRoom, getAllRooms, updateRoom } from "../../services/roomService.js";
import useAutoDismiss from "../../hooks/useAutoDismiss.js";
import { getRole } from "../../services/authService.js";

const EMPTY_FORM = { buildingId: "", roomNumber: "", sharingType: "SINGLE", roomType: "NON_AC", roomStatus: "AVAILABLE" };
const SHARING_OPTIONS = ["SINGLE", "DOUBLE", "TRIPLE", "FOUR"].map((value) => ({ value, label: `${value.charAt(0)}${value.slice(1).toLowerCase()} Sharing` }));
const ROOM_TYPE_OPTIONS = [
  { value: "AC", label: "AC" },
  { value: "NON_AC", label: "Non-AC" },
];
const STATUS_OPTIONS = ["AVAILABLE", "OCCUPIED", "UNDER_REPAIR", "BLOCKED"].map((value) => ({ value, label: value.replaceAll("_", " ") }));
const INPUT_CLASS = "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-sm outline-none transition-all duration-200 hover:border-stone-400 focus:border-stone-700 focus:bg-white focus:ring-4 focus:ring-stone-100";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [buildingFilter, setBuildingFilter] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const role = getRole()
    ?.replace("ROLE_", "")
    ?.toUpperCase();

  const canManageRooms =
    role === "ADMIN" ||
    role === "BUILDING_ADMIN";

  const clearError = useCallback(() => {
    setError("");
  }, []);

  const clearMessage = useCallback(() => {
    setMessage("");
  }, []);

  useAutoDismiss(error, clearError, 4000);
  useAutoDismiss(message, clearMessage, 4000);

  const load = async () => {
    try {
      setLoading(true);
      const [roomData, buildingData] = await Promise.all([getAllRooms(), getAllBuildings()]);
      setRooms(Array.isArray(roomData) ? roomData : []);
      setBuildings(Array.isArray(buildingData) ? buildingData : []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load rooms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const buildingOptions = useMemo(() => [
    { value: "", label: "All Buildings" },
    ...buildings.map((building) => ({ value: building.buildingId, label: building.buildingName })),
  ], [buildings]);

  const formBuildingOptions = useMemo(() => buildings.map((building) => ({ value: building.buildingId, label: building.buildingName })), [buildings]);

  const visibleRooms = buildingFilter
    ? rooms.filter((room) => String(room.buildingId) === String(buildingFilter))
    : rooms;

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, buildingId: buildings[0]?.buildingId || "" });
    setOpen(true);
    setError("");
  };

  const openEdit = (room) => {
    setEditingId(room.roomId);
    setForm({ buildingId: room.buildingId, roomNumber: room.roomNumber, sharingType: room.sharingType, roomType: room.roomType || "NON_AC", roomStatus: room.roomStatus });
    setOpen(true);
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      setSaving(true);
      const payload = { ...form, buildingId: Number(form.buildingId), roomNumber: form.roomNumber.trim() };
      if (!payload.buildingId || !payload.roomNumber) throw new Error("Please select a building and enter a room number.");
      if (editingId) await updateRoom(editingId, payload); else await createRoom(payload);
      setMessage(editingId ? "Room updated successfully." : "Room created successfully.");
      setOpen(false);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Unable to save room.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (room) => {
    if (!window.confirm(`Delete room ${room.roomNumber}?`)) return;
    try {
      setProcessingId(room.roomId);
      await deleteRoom(room.roomId);
      setMessage("Room deleted successfully.");
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete room.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F0] px-4 py-6 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminHeader title="Rooms" subtitle="Manage rooms by building and sharing type." />

        <section className="mt-7 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <PremiumSelect label="Building" value={buildingFilter} options={buildingOptions} onChange={setBuildingFilter} />
            {canManageRooms && (
              <ActionButton
                onClick={openCreate}
                variant="primary"
                disabled={buildings.length === 0}
              >
                Add Room
              </ActionButton>
            )}
          </div>
        </section>

        {error && <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
        {message && <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}

        <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {!loading && visibleRooms.map((room, index) => (
            <motion.article key={room.roomId} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }} transition={{ delay: index * 0.04 }} className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm hover:shadow-lg">
              <p className="text-[8px] font-bold uppercase tracking-widest text-stone-400">{room.buildingName}</p>
              <div className="mt-3 flex items-start justify-between gap-3">
                <h3 className="text-2xl font-black tracking-tighter">Room {room.roomNumber}</h3>
                <span className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1.5 text-[7px] font-bold uppercase text-stone-700">{room.roomStatus}</span>
              </div>
              <p className="mt-3 text-sm text-stone-500">{room.sharingType} sharing · Capacity {room.capacity} ·{" "}
                {room.roomType === "AC" ? "AC" : "Non-AC"}</p>
              {canManageRooms && (
                <div className="mt-7 flex gap-3">
                  <ActionButton
                    onClick={() => openEdit(room)}
                    className="flex-1"
                  >
                    Edit
                  </ActionButton>

                  <ActionButton
                    onClick={() => remove(room)}
                    disabled={processingId === room.roomId}
                    variant="danger"
                    className="flex-1"
                  >
                    {processingId === room.roomId
                      ? "Deleting..."
                      : "Delete"}
                  </ActionButton>
                </div>
              )}
            </motion.article>
          ))}
        </section>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm" onClick={() => !saving && setOpen(false)}>
          <motion.section initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-3xl font-black tracking-tighter">{editingId ? "Edit room" : "Add room"}</h2><ActionButton onClick={() => setOpen(false)} variant="soft">Close</ActionButton></div>
            <form onSubmit={submit} className="mt-6 space-y-5">
              <PremiumSelect label="Building" value={form.buildingId} options={formBuildingOptions} onChange={(value) => setForm((current) => ({ ...current, buildingId: value }))} placeholder="Select building" />
              <input value={form.roomNumber} onChange={(event) => setForm((current) => ({ ...current, roomNumber: event.target.value }))} placeholder="Room number" className={INPUT_CLASS} />
              <PremiumSelect label="Sharing Type" value={form.sharingType} options={SHARING_OPTIONS} onChange={(value) => setForm((current) => ({ ...current, sharingType: value }))} />
              <PremiumSelect
                label="Room Type"
                value={form.roomType}
                options={ROOM_TYPE_OPTIONS}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    roomType: value
                  }))
                }
              />
              <PremiumSelect label="Room Status" value={form.roomStatus} options={STATUS_OPTIONS} onChange={(value) => setForm((current) => ({ ...current, roomStatus: value }))} />
              <div className="flex justify-end gap-3 pt-2"><ActionButton onClick={() => setOpen(false)}>Cancel</ActionButton><ActionButton type="submit" disabled={saving} variant="primary">{saving ? "Saving..." : "Save Room"}</ActionButton></div>
            </form>
          </motion.section>
        </div>
      )}
    </main>
  );
}
