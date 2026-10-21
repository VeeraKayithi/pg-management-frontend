const CAPACITY_BY_SHARING = { SINGLE: 1, DOUBLE: 2, TRIPLE: 3, FOUR: 4 };
const ROOM_STATUSES = new Set(["AVAILABLE", "OCCUPIED", "BLOCKED", "UNDER_REPAIR"]);

export const idOf = (value) => String(value ?? "");
export const upper = (value) => String(value ?? "").toUpperCase();
export const formatNumber = (value) => Number(value).toLocaleString("en-IN");
export const occupancyLabel = (value) => value == null ? "—" : `${value}%`;
export const bedLabel = (count) => `${formatNumber(count)} ${count === 1 ? "bed" : "beds"}`;

export function capacityOf(room) {
  const supplied = room.capacity;
  const value = supplied == null || supplied === ""
    ? CAPACITY_BY_SHARING[upper(room.sharingType)]
    : Number(supplied);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

export function roomTypeLabel(value) {
  if (upper(value) === "AC") return "AC";
  if (upper(value) === "NON_AC") return "Non-AC";
  return "Type not set";
}

export function roomAvailability(room) {
  if (room.roomStatus === "BLOCKED") return { key: "BLOCKED", label: "Blocked", tone: "unavailable" };
  if (room.roomStatus === "UNDER_REPAIR") return { key: "UNDER_REPAIR", label: "Under repair", tone: "unavailable" };
  if (!room.capacity) return { key: "UNKNOWN", label: "Capacity not set", tone: "muted" };
  if (!ROOM_STATUSES.has(room.roomStatus)) return { key: "UNKNOWN", label: "Status not set", tone: "muted" };
  if (room.occupied > room.capacity) return { key: "OVER_CAPACITY", label: "Over capacity", tone: "unavailable" };
  if (room.available === 0) return { key: "FULL", label: "Full", tone: "full" };
  return { key: "OPEN", label: "Beds available", tone: "available" };
}

export function summarizeRooms(rooms) {
  const usable = rooms.filter((room) => !room.unavailable && room.capacity > 0 && room.knownStatus);
  const totalBeds = usable.reduce((sum, room) => sum + room.capacity, 0);
  // Keep the actual assignment count: an over-capacity record must not be silently capped.
  const occupiedBeds = usable.reduce((sum, room) => sum + room.occupied, 0);
  return {
    rooms: rooms.length,
    totalBeds,
    occupiedBeds,
    availableBeds: rooms.reduce((sum, room) => sum + room.available, 0),
    blocked: rooms.filter((room) => room.roomStatus === "BLOCKED").length,
    underRepair: rooms.filter((room) => room.roomStatus === "UNDER_REPAIR").length,
    unavailable: rooms.filter((room) => room.unavailable).length,
    issues: rooms.filter((room) => !room.capacity || !room.knownStatus || room.occupied > room.capacity).length,
    occupancy: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : null,
  };
}

export function buildOverview(buildings, rooms, tenants) {
  const activeTenants = tenants.filter((tenant) => upper(tenant.tenantStatus) === "ACTIVE");
  const residentsByRoom = new Map();
  activeTenants.forEach((tenant) => {
    if (tenant.roomId == null) return;
    const key = idOf(tenant.roomId);
    if (!residentsByRoom.has(key)) residentsByRoom.set(key, []);
    residentsByRoom.get(key).push(tenant);
  });
  const computedRooms = rooms.map((room) => {
    const residents = residentsByRoom.get(idOf(room.roomId)) || [];
    const capacity = capacityOf(room);
    const status = upper(room.roomStatus);
    const unavailable = status === "BLOCKED" || status === "UNDER_REPAIR";
    const knownStatus = ROOM_STATUSES.has(status);
    return { ...room, roomStatus: status, capacity, residents, occupied: residents.length,
      unavailable, knownStatus,
      available: unavailable || !knownStatus ? 0 : Math.max(capacity - residents.length, 0) };
  }).sort((a, b) => String(a.roomNumber ?? "").localeCompare(String(b.roomNumber ?? ""), "en", { numeric: true }));
  const roomsByBuilding = new Map();
  computedRooms.forEach((room) => {
    const key = idOf(room.buildingId);
    if (!roomsByBuilding.has(key)) roomsByBuilding.set(key, []);
    roomsByBuilding.get(key).push(room);
  });
  const properties = buildings.map((building) => {
    const buildingRooms = roomsByBuilding.get(idOf(building.buildingId)) || [];
    return { ...building, rooms: buildingRooms, summary: summarizeRooms(buildingRooms) };
  });
  return { properties, activeTenants, rooms: computedRooms, portfolio: summarizeRooms(computedRooms) };
}

export function roomMatches(room, term) {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  return String(room.roomNumber ?? "").toLowerCase().includes(query)
    || room.residents.some((tenant) => [tenant.name, tenant.mobileNumber]
      .some((value) => String(value ?? "").toLowerCase().includes(query)));
}

export function propertyMatches(property, term) {
  const query = term.trim().toLowerCase();
  return !query || String(property.buildingName ?? "").toLowerCase().includes(query)
    || property.rooms.some((room) => roomMatches(room, query));
}
