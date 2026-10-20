import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import AdminHeader from "../../components/admin/AdminHeader.jsx";
import { getAllBuildings } from "../../services/buildingService.js";
import { getAllRooms } from "../../services/roomService.js";
import { getAllTenants } from "../../services/tenantService.js";
import useAutoDismiss from "../../hooks/useAutoDismiss.js";
import { Link } from "react-router-dom";
import { getRole } from "../../services/authService.js";

const CAPACITY = { SINGLE: 1, DOUBLE: 2, TRIPLE: 3, FOUR: 4 };
const id = (value) => String(value ?? "");
const capacityOf = (room) => Number(room.capacity) || CAPACITY[room.sharingType?.toUpperCase()] || 0;

export default function AdminDashboard() {
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const role = getRole()
    ?.replace("ROLE_", "")
    ?.toUpperCase();

  const isSuperAdmin = role === "ADMIN";

  const clearError = useCallback(() => {
    setError("");
  }, []);

  useAutoDismiss(error, clearError, 4000);

  const load = async () => {


    try {
      setLoading(true);
      setError("");
      const [b, r, t] = await Promise.all([getAllBuildings(), getAllRooms(), getAllTenants()]);

      const safeB = Array.isArray(b) ? b : [];
      setBuildings(safeB);
      setRooms(Array.isArray(r) ? r : []);
      setTenants(Array.isArray(t) ? t : []);
      setSelectedBuildingId((current) =>
        safeB.some((item) => id(item.buildingId) === id(current))
          ? current
          : safeB[0]?.buildingId ?? ""
      );
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setSelectedRoomId(""); }, [selectedBuildingId]);

  const activeTenants = useMemo(
    () => tenants.filter((tenant) => tenant.tenantStatus?.toUpperCase() === "ACTIVE"),
    [tenants]
  );

  const selectedBuilding = buildings.find((b) => id(b.buildingId) === id(selectedBuildingId));
  const details = useMemo(() => rooms
    .filter((room) => id(room.buildingId) === id(selectedBuildingId))
    .map((room) => {
      const residents = activeTenants.filter((tenant) => id(tenant.roomId) === id(room.roomId));
      const capacity = capacityOf(room);
      return {
        ...room,
        capacity,
        residents,
        occupied: residents.length,
        available: Math.max(capacity - residents.length, 0),
        status: capacity > 0 && residents.length >= capacity ? "OCCUPIED" : "AVAILABLE",
      };
    }), [rooms, activeTenants, selectedBuildingId]);

  const summary = useMemo(() => ({
    rooms: details.length,
    tenants: details.reduce((sum, room) => sum + room.occupied, 0),
    availableRooms: details.filter((room) => room.status === "AVAILABLE").length,
    occupiedRooms: details.filter((room) => room.status === "OCCUPIED").length,
    availableBeds: details.reduce((sum, room) => sum + room.available, 0),
  }), [details]);

  const selectedRoom = details.find((room) => id(room.roomId) === id(selectedRoomId));

  return (
    <main className="min-h-screen bg-[#F5F5F0] px-4 py-6 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminHeader title="Operations Overview" subtitle="Building-wise rooms, beds and active residents." />

        {error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Buildings", buildings.length],
            ["Rooms", rooms.length],
            ["Active Tenants", activeTenants.length],
          ].map(([label, value]) => (
            <article key={label} className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{label}</p>
              <p className="mt-3 text-4xl font-black tracking-tighter">{String(value).padStart(2, "0")}</p>
            </article>
          ))}
        </section>

        {isSuperAdmin && (
          <section className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
                  Administration
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tighter">
                  Staff Accounts
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-500">
                  Create and manage Building Admin and Supervisor accounts
                  for each PG building.
                </p>
              </div>

              <Link
                to="/admin/staff-accounts"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-white transition hover:bg-stone-700"
              >
                Manage Staff
              </Link>

            </div>
          </section>
        )}

        <section className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Select Building</p>
              <h2 className="mt-2 text-2xl font-black tracking-tighter">Building operations</h2>
            </div>
            <button onClick={load} disabled={loading} className="rounded-full border border-stone-300 px-4 py-2 text-[8px] font-bold uppercase tracking-widest">Refresh</button>
          </div>

          <div className="mt-5 flex gap-3 overflow-x-auto pb-2 app-scrollbar-horizontal">
            {buildings.map((building) => {
              const selected = id(building.buildingId) === id(selectedBuildingId);
              return (
                <button
                  key={building.buildingId}
                  onClick={() => setSelectedBuildingId(building.buildingId)}
                  className={`min-w-52 rounded-2xl border p-4 text-left transition ${selected ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-stone-50"}`}
                >
                  <p className={`text-[8px] font-bold uppercase tracking-widest ${selected ? "text-stone-300" : "text-stone-400"}`}>{building.buildingType}</p>
                  <p className="mt-2 font-black">{building.buildingName}</p>
                  <p className={`mt-1 text-xs ${selected ? "text-stone-300" : "text-stone-500"}`}>{building.city}</p>
                </button>
              );
            })}
          </div>
        </section>

        {selectedBuilding && (
          <>
            <section className="mt-8">
              <h2 className="text-3xl font-black tracking-tighter">{selectedBuilding.buildingName}</h2>
              <p className="mt-1 text-sm text-stone-500">{[selectedBuilding.address, selectedBuilding.city].filter(Boolean).join(", ")}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {Object.entries(summary).map(([key, value]) => (
                  <article key={key} className="rounded-2xl border border-stone-200 bg-white p-5">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-stone-400">{key.replace(/([A-Z])/g, " $1")}</p>
                    <p className="mt-2 text-3xl font-black">{value}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {details.map((room) => (
                <motion.button
                  key={room.roomId}
                  whileHover={{ y: -3 }}
                  onClick={() => setSelectedRoomId(id(room.roomId) === id(selectedRoomId) ? "" : room.roomId)}
                  className={`rounded-[1.75rem] border p-5 text-left ${id(room.roomId) === id(selectedRoomId) ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white"}`}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-stone-400">{room.sharingType} Sharing</p>
                      <h3 className="mt-2 text-2xl font-black">Room {room.roomNumber}</h3>
                    </div>
                    <span className={`h-fit rounded-full px-3 py-1 text-[7px] font-bold ${room.status === "OCCUPIED" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{room.status}</span>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-[7px] uppercase text-stone-400">Occupied</p><p className="font-black">{room.occupied}/{room.capacity}</p></div>
                    <div><p className="text-[7px] uppercase text-stone-400">Available</p><p className="font-black">{room.available}</p></div>
                    <div><p className="text-[7px] uppercase text-stone-400">Capacity</p><p className="font-black">{room.capacity}</p></div>
                  </div>
                </motion.button>
              ))}
            </section>

            {selectedRoom && (
              <section className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-6">
                <h2 className="text-2xl font-black">Room {selectedRoom.roomNumber} residents</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedRoom.residents.length ? selectedRoom.residents.map((tenant) => (
                    <article key={tenant.tenantId} className="rounded-2xl bg-stone-50 p-4">
                      <p className="font-black">{tenant.name}</p>
                      <p className="mt-1 text-sm text-stone-500">{tenant.mobileNumber}</p>
                    </article>
                  )) : <p className="text-sm text-stone-500">No active tenants in this room.</p>}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
