import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Building2, ChevronRight, RefreshCw, Search, X } from "lucide-react";
import AdminHeader from "../../components/admin/AdminHeader.jsx";
import { getAllBuildings } from "../../services/buildingService.js";
import { getAllRooms } from "../../services/roomService.js";
import { getAllTenants } from "../../services/tenantService.js";
import { getRole } from "../../services/authService.js";
import { buildOverview, formatNumber, idOf, occupancyLabel, roomAvailability, roomMatches, roomTypeLabel } from "../../utils/overviewMetrics.js";

const cols = "grid grid-cols-[minmax(0,2fr)_70px_95px_110px_90px] items-center gap-3";
const roomCols = "grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_65px_80px_110px] items-center gap-3";
const btn = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#D7E0E7] bg-white px-4 text-xs font-semibold text-[#183B5B] transition hover:bg-[#E8F0F7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183B5B] disabled:opacity-50";
const statusClasses = {
  available: "bg-emerald-50 text-emerald-800",
  full: "bg-blue-50 text-[#183B5B]",
  unavailable: "bg-amber-50 text-amber-800",
  muted: "bg-slate-100 text-slate-600",
};

function Status({ room }) {
  const { label, tone } = roomAvailability(room);
  return <span className={`inline-flex rounded px-2.5 py-1 text-xs font-semibold ${statusClasses[tone] || statusClasses.muted}`}>{label}</span>;
}

function Stat({ label, value }) {
  return <div className="min-w-0 border-r border-white/20 px-5 py-4 last:border-r-0 sm:py-5">
    <dt className="text-[11px] font-semibold text-blue-100">{label}</dt>
    <dd className="mt-1 text-3xl font-bold tabular-nums text-white">{formatNumber(value)}</dd>
  </div>;
}

export default function AdminDashboard() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [filter, setFilter] = useState("ALL");
  const requestId = useRef(0);
  const role = getRole()?.replace(/^ROLE_/i, "")?.toUpperCase();

  const load = useCallback(async () => {
    const currentId = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const [buildings, rooms, tenants] = await Promise.all([getAllBuildings(), getAllRooms(), getAllTenants()]);
      if (![buildings, rooms, tenants].every(Array.isArray)) throw new Error("Unexpected response from the server.");
      if (currentId !== requestId.current) return;
      setSnapshot({ buildings, rooms, tenants, loadedAt: new Date() });
      setSelectedBuildingId((prev) => buildings.some((b) => idOf(b.buildingId) === idOf(prev)) ? prev : idOf(buildings[0]?.buildingId));
    } catch (e) {
      if (currentId === requestId.current) setError(e.response?.data?.message || e.message || "Could not load Overview.");
    } finally {
      if (currentId === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]);

  const overview = useMemo(() => snapshot ? buildOverview(snapshot.buildings, snapshot.rooms, snapshot.tenants) : null, [snapshot]);
  const normalizedQuery = query.trim().toLowerCase();
  const properties = useMemo(() => overview?.properties.filter((property) => {
    if (!normalizedQuery) return true;
    return [property.buildingName, property.city].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery))
      || property.rooms.some((room) => roomMatches(room, normalizedQuery));
  }) || [], [overview, normalizedQuery]);
  const selectedProperty = properties.find((p) => idOf(p.buildingId) === selectedBuildingId) || properties[0] || null;
  const rooms = selectedProperty?.rooms || [];
  const matchingRooms = rooms.filter((room) => {
    const propertyMatches = [selectedProperty?.buildingName, selectedProperty?.city].some((v) => String(v ?? "").toLowerCase().includes(normalizedQuery));
    const matchesSearch = !normalizedQuery || propertyMatches || roomMatches(room, normalizedQuery);
    const key = roomAvailability(room).key;
    return matchesSearch && (filter === "ALL" || (filter === "REVIEW" ? ["UNKNOWN", "OVER_CAPACITY"].includes(key) : filter === key));
  });
  const selectedRoom = rooms.find((room) => idOf(room.roomId) === selectedRoomId) || null;

  const chooseProperty = (id) => { setSelectedBuildingId(idOf(id)); setSelectedRoomId(""); setFilter("ALL"); };
  const changeSearch = (value) => { setQuery(value); setSelectedRoomId(""); setFilter("ALL"); };

  return <main className="mx-auto max-w-[1500px] bg-[var(--pg-bg)] px-4 py-6 text-[#183B5B] sm:px-7 lg:px-9">
    <AdminHeader title="Portfolio overview" subtitle="Compare availability across your properties and inspect rooms." />

    {error && <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertCircle size={18} /> <span className="flex-1">{error}{snapshot ? " Showing the last loaded data." : ""}</span>
      <button onClick={load} disabled={loading} className={btn}>Retry</button>
    </div>}

    {!snapshot ? <div className="rounded-lg border border-[#E7E2D8] bg-white p-10 text-sm text-[#78716C]" role="status">
      {loading ? "Loading properties, rooms and residents…" : "No data available. Use Retry to reload."}
    </div> : <>
      <section className="overflow-hidden rounded-lg border border-[#D7E0E7] bg-white shadow-sm" aria-label="Portfolio totals">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#183B5B] px-5 py-3 text-white">
          <div className="text-xs font-semibold tracking-wide">NANDU / Portfolio operations</div>
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded border border-white/30 px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-50">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        <dl className="grid grid-cols-2 bg-[#183B5B] sm:grid-cols-4">
          <Stat label="Properties" value={overview.properties.length} />
          <Stat label="Rooms" value={overview.portfolio.rooms} />
          <Stat label="Active residents" value={overview.activeTenants.length} />
          <Stat label="Beds available" value={overview.portfolio.availableBeds} />
        </dl>
      </section>

      <section className="mt-5 overflow-hidden rounded-lg border border-[#E7E2D8] bg-white" aria-labelledby="properties-heading">
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-4">
          <div><h2 id="properties-heading" className="text-lg font-bold">Properties</h2><p className="mt-1 text-xs text-[#78716C]">Select a building to inspect its registered rooms.</p></div>
          <div className="flex flex-wrap gap-2">
            <label className="relative block"><span className="sr-only">Search property, room or resident</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#78716C]" />
              <input type="search" value={query} onChange={(e) => changeSearch(e.target.value)} placeholder="Search property, room or resident" className="h-10 w-full min-w-0 rounded-md border border-[#D7E0E7] bg-white pl-9 pr-3 text-sm outline-offset-2 focus:outline-[#183B5B] sm:w-[290px]" />
            </label>
            {role !== "SUPERVISOR" && <Link to="/admin/tenants" className="inline-flex h-10 items-center rounded-md bg-[#183B5B] px-4 text-xs font-semibold text-white hover:bg-[#102F4B]">Manage tenants</Link>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[650px]">
            <div className={`${cols} bg-[#E8F0F7] px-5 py-3 text-[11px] font-bold uppercase tracking-wide`}>
              <span>Property</span><span>Rooms</span><span>Beds free</span><span>Occupancy</span><span>Unavailable</span>
            </div>
            {properties.map((p) => <button key={p.buildingId} type="button" onClick={() => chooseProperty(p.buildingId)} aria-pressed={selectedProperty?.buildingId === p.buildingId}
              className={`${cols} w-full border-t border-[#E7E2D8] px-5 py-3 text-left text-sm hover:bg-[#F3F7FA] ${selectedProperty?.buildingId === p.buildingId ? "bg-[#E8F0F7] font-semibold" : ""}`}>
              <span className="flex min-w-0 items-center gap-2"><ChevronRight size={15} className="shrink-0" />{p.buildingName}</span>
              <span>{p.summary.rooms}</span><span>{p.summary.availableBeds}</span><span>{occupancyLabel(p.summary.occupancy)}</span><span>{p.summary.unavailable}</span>
            </button>)}
          </div>
        </div>
        {!properties.length && <p className="p-6 text-sm text-[#78716C]">No matching properties. <button onClick={() => changeSearch("")} className="underline">Clear search</button></p>}
      </section>

      {selectedProperty && <section className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_290px]" aria-labelledby="rooms-heading">
        <div className="min-w-0 overflow-hidden rounded-lg border border-[#E7E2D8] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div><h2 id="rooms-heading" className="text-lg font-bold">{selectedProperty.buildingName}</h2><p className="mt-1 text-xs text-[#78716C]">Room inventory · {selectedProperty.summary.availableBeds} beds free</p></div>
            <Link to="/admin/rooms" className={`${btn}`}>Manage rooms <ArrowRight size={15} /></Link>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-[#E7E2D8] px-5 py-3" aria-label="Filter room availability">
            {[["ALL", "All rooms"], ["OPEN", "Available"], ["FULL", "Full"], ["UNDER_REPAIR", "Repair"], ["BLOCKED", "Blocked"], ["REVIEW", "Needs review"]].map(([key, text]) => <button key={key} onClick={() => { setFilter(key); setSelectedRoomId(""); }} aria-pressed={filter === key}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${filter === key ? "border-[#183B5B] bg-[#183B5B] text-white" : "border-[#D7E0E7] bg-white text-[#183B5B] hover:bg-[#E8F0F7]"}`}>{text}</button>)}
          </div>
          <div className="overflow-x-auto"><div className="min-w-[590px]">
            <div className={`${roomCols} bg-[#E8F0F7] px-5 py-3 text-[11px] font-bold uppercase tracking-wide`}>
              <span>Room</span><span>Configuration</span><span>Occupied</span><span>Beds free</span><span>State</span>
            </div>
            {matchingRooms.map((r) => <button key={r.roomId} type="button" onClick={() => setSelectedRoomId(idOf(r.roomId))} aria-pressed={selectedRoomId === idOf(r.roomId)}
              className={`${roomCols} w-full border-t border-[#E7E2D8] px-5 py-3 text-left text-sm hover:bg-[#E8F0F7] ${selectedRoomId === idOf(r.roomId) ? "bg-[#E8F0F7]" : ""}`}>
              <span className="font-bold">{r.roomNumber}</span>
              <span>{String(r.sharingType || "").replaceAll("_", " ").toLowerCase()} · {roomTypeLabel(r.roomType)}</span>
              <span>{r.occupied}/{r.capacity || "—"}</span>
              <span>{r.unavailable || !r.knownStatus || !r.capacity ? "—" : r.available}</span>
              <Status room={r} />
            </button>)}
          </div></div>
          {!matchingRooms.length && <div className="px-5 py-8 text-sm text-[#78716C]">No rooms match the selected filters.</div>}
        </div>
        <aside className="rounded-lg border border-[#E7E2D8] bg-white p-5" aria-label="Room inspector">
          {selectedRoom ? <>
            <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-bold">Room {selectedRoom.roomNumber}</h3><button type="button" className="rounded p-1 hover:bg-[#E8F0F7]" aria-label="Close room details" onClick={() => setSelectedRoomId("")}><X size={18}/></button></div>
            <div className="mt-2"><Status room={selectedRoom}/></div>
            <p className="mt-3 text-xs text-[#78716C]">{selectedProperty.buildingName} · {selectedRoom.sharingType} · {roomTypeLabel(selectedRoom.roomType)}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 border-y border-[#E7E2D8] py-4 text-center">
              {[["Capacity", selectedRoom.capacity || "—"], ["Occupied", selectedRoom.occupied], ["Free", selectedRoom.unavailable ? "—" : selectedRoom.available]].map(([label, value]) => <div key={label}><div className="text-[10px] text-[#78716C]">{label}</div><div className="mt-1 text-xl font-bold">{value}</div></div>)}
            </div>
            <h4 className="mt-5 text-xs font-bold uppercase tracking-wide">Active residents</h4>
            {selectedRoom.residents.length ? <ul className="mt-3 space-y-3">{selectedRoom.residents.map((t) => <li key={t.tenantId} className="border-b border-[#E7E2D8] pb-3"><p className="text-sm font-semibold">{t.name}</p><p className="mt-1 text-xs text-[#78716C]">{t.mobileNumber || "Contact unavailable"}</p></li>)}</ul> : <p className="mt-3 text-xs text-[#78716C]">No active residents assigned.</p>}
            <Link to="/admin/tenants" className={`${btn} mt-5 w-full`}>Open tenant directory <ArrowRight size={14}/></Link>
          </> : <><Building2 size={23} className="text-[#183B5B]"/><h3 className="mt-3 text-sm font-bold">Room inspector</h3><p className="mt-2 text-xs leading-5 text-[#78716C]">Select a room from the table to see its occupancy and active residents.</p></>}
        </aside>
      </section>}
      <p className="mt-4 text-[11px] text-[#78716C]">Availability excludes blocked and under-repair rooms. Data last loaded at {snapshot.loadedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}.</p>
    </>}
  </main>;
}
