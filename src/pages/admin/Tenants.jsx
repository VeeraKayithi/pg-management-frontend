import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, X } from "lucide-react";

import AdminHeader from "../../components/admin/AdminHeader.jsx";
import NanduSelect from "../../components/admin/NanduSelect.jsx";
import { getAllBuildings } from "../../services/buildingService.js";
import { getAllRooms } from "../../services/roomService.js";
import { createTenant, getAllTenants, markTenantAsLeft, updateTenant, } from "../../services/tenantService.js";
import useAutoDismiss from "../../hooks/useAutoDismiss.js";
import { createTenantAccount } from "../../services/userService.js";
import { getRole } from "../../services/authService.js";

const getTodayDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(
    now.getTime() - offset * 60 * 1000
  );

  return localDate.toISOString().split("T")[0];
};

const getEmptyForm = () => ({
  name: "",
  mobileNumber: "",
  email: "",
  joiningDate: getTodayDate(),
  buildingId: "",
  roomId: "",
  createPortalAccount: false,
  temporaryUsername: "",
});

const INPUT_CLASS = "mt-1.5 w-full min-h-11 rounded-lg border border-[#CDD8E3] bg-white px-3 py-2.5 text-sm text-[#183B5B] outline-none focus:border-[#183B5B] focus:ring-2 focus:ring-[#E8F0F7]";
const FIELD_LABEL = "block text-xs font-semibold text-[#183B5B]";
const PRIMARY = "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#183B5B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102F4B] disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY = "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#CDD8E3] bg-white px-5 py-2.5 text-sm font-semibold text-[#183B5B] transition hover:bg-[#E8F0F7] disabled:opacity-50";

function getErrorMessage(error, fallback) {
  const responseData = error.response?.data;

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (responseData && typeof responseData === "object") {
    const messages = Object.values(responseData).filter(
      (value) => typeof value === "string"
    );

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return fallback;
}

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);

  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState(getEmptyForm());
  const [editingTenantId, setEditingTenantId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [processingTenantId, setProcessingTenantId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [accountRecovery, setAccountRecovery] = useState(null);
  const [portalAccountTenant, setPortalAccountTenant] = useState(null);
  const [departureTenant, setDepartureTenant] = useState(null);
  const [portalUsername, setPortalUsername] = useState("");
  const [isCreatingPortalAccount, setIsCreatingPortalAccount] = useState(false);
  const role = getRole()
    ?.replace("ROLE_", "")
    ?.toUpperCase();

  const isSuperAdmin = role === "ADMIN";

  const canManageTenants =
    role === "ADMIN" ||
    role === "BUILDING_ADMIN";

  const canManagePortalAccounts =
    role === "ADMIN";

  const clearError = useCallback(() => {
    setError("");
  }, []);

  const clearSuccessMessage = useCallback(() => {
    setSuccessMessage("");
  }, []);

  useAutoDismiss(error, clearError, 4000);

  useAutoDismiss(
    successMessage,
    clearSuccessMessage,
    4000
  );


  const loadData = async () => {
    try {
      setIsLoading(true);
      setError("");

      const [tenantData, roomData, buildingData] = await Promise.all([
        getAllTenants(),
        getAllRooms(),
        getAllBuildings(),
      ]);

      setTenants(Array.isArray(tenantData) ? tenantData : []);
      setRooms(Array.isArray(roomData) ? roomData : []);
      setBuildings(Array.isArray(buildingData) ? buildingData : []);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load tenant information."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const statusOptions = useMemo(
    () => [
      { value: "ACTIVE", label: "Active Tenants" },
      { value: "LEFT", label: "Left Tenants" },
      { value: "", label: "All Tenants" },
    ],
    []
  );

  const buildingOptions = useMemo(() => {
    const availableBuildings = buildings.map((building) => ({
      value: building.buildingId,
      label: building.buildingName,
    }));

    if (isSuperAdmin) {
      return [
        { value: "", label: "All Buildings" },
        ...availableBuildings,
      ];
    }

    return availableBuildings;
  }, [buildings, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin && buildings.length === 1) {
      setBuildingFilter(
        String(buildings[0].buildingId)
      );
    }
  }, [buildings, isSuperAdmin]);

  const roomsForSelectedBuilding = useMemo(() => {
    if (!buildingFilter) {
      return rooms;
    }

    return rooms.filter(
      (room) => String(room.buildingId) === String(buildingFilter)
    );
  }, [rooms, buildingFilter]);

  const roomOptions = useMemo(
    () => [
      { value: "", label: "All Rooms" },
      ...roomsForSelectedBuilding.map((room) => ({
        value: room.roomId,
        label: `${room.buildingName} · Room ${room.roomNumber}`,
      })),
    ],
    [roomsForSelectedBuilding]
  );

  const formBuildingOptions = useMemo(
    () =>
      buildings.map((building) => ({
        value: building.buildingId,
        label: building.buildingName,
      })),
    [buildings]
  );

  const formRooms = useMemo(() => {
    if (!formData.buildingId) {
      return [];
    }

    return rooms.filter(
      (room) =>
        String(room.buildingId) === String(formData.buildingId)
    );
  }, [rooms, formData.buildingId]);

  const assignRoomOptions = useMemo(
    () =>
      formRooms.map((room) => ({
        value: room.roomId,
        label: `Room ${room.roomNumber} · ${room.roomType === "AC" ? "AC" : "Non-AC"
          } · ${room.sharingType} · ${room.roomStatus}`,
      })),
    [formRooms]
  );
  const visibleTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const term = search.trim().toLowerCase();
      const matchesSearch = !term || [tenant.name, tenant.mobileNumber, tenant.email, tenant.roomNumber].some((v) => String(v ?? "").toLowerCase().includes(term));
      const matchesStatus =
        !statusFilter ||
        tenant.tenantStatus?.toUpperCase() === statusFilter;

      const tenantRoom = rooms.find(
        (room) => String(room.roomId) === String(tenant.roomId)
      );

      const matchesBuilding =
        !buildingFilter ||
        String(tenantRoom?.buildingId) === String(buildingFilter);

      const matchesRoom =
        !roomFilter || String(tenant.roomId) === String(roomFilter);

      return matchesSearch && matchesStatus && matchesBuilding && matchesRoom;
    });
  }, [tenants, rooms, statusFilter, buildingFilter, roomFilter, search]);

  const clearFilters = () => {
    setStatusFilter("ACTIVE");

    if (!isSuperAdmin && buildings.length === 1) {
      setBuildingFilter(
        String(buildings[0].buildingId)
      );
    } else {
      setBuildingFilter("");
    }

    setRoomFilter("");
    setSearch("");
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((currentForm) => {
      const nextValue = type === "checkbox" ? checked : value;
      const nextForm = {
        ...currentForm,
        [name]: nextValue,
      };

      if (
        name === "mobileNumber" &&
        (!currentForm.temporaryUsername ||
          currentForm.temporaryUsername === currentForm.mobileNumber)
      ) {
        nextForm.temporaryUsername = value;
      }

      return nextForm;
    });
  };

  const openCreateForm = () => {
    setEditingTenantId(null);
    setFormData(getEmptyForm());
    setError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  };

  const openEditForm = (tenant) => {
    const tenantRoom = rooms.find(
      (room) => String(room.roomId) === String(tenant.roomId)
    );

    setEditingTenantId(tenant.tenantId);
    setFormData({
      name: tenant.name || "",
      mobileNumber: tenant.mobileNumber || "",
      email: tenant.email || "",
      joiningDate: tenant.joiningDate || "",
      buildingId: tenantRoom?.buildingId || "",
      roomId: tenant.roomId || "",
      createPortalAccount: false,
      temporaryUsername: "",
    });
    setError("");
    setSuccessMessage("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingTenantId(null);
    setFormData(getEmptyForm());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const tenantPayload = {
      name: formData.name.trim(),
      mobileNumber: formData.mobileNumber.trim(),
      email: formData.email.trim() || null,
      joiningDate: formData.joiningDate,
      roomId: Number(formData.roomId),
    };

    if (
      !tenantPayload.name ||
      !tenantPayload.mobileNumber ||
      !tenantPayload.joiningDate ||
      !formData.buildingId ||
      !tenantPayload.roomId
    ) {
      setError(
        "Tenant name, mobile number, joining date, building, and room are required."
      );
      return;
    }

    if (
      !editingTenantId &&
      canManagePortalAccounts && formData.createPortalAccount &&
      !formData.temporaryUsername.trim()
    ) {
      setError("Temporary username is required for portal access.");
      return;
    }

    try {
      setIsSaving(true);

      if (editingTenantId) {
        await updateTenant(editingTenantId, tenantPayload);
        setSuccessMessage("Tenant updated successfully.");
        setIsFormOpen(false);
        setEditingTenantId(null);
        setFormData(getEmptyForm());
        await loadData();
        return;
      }

      const createdTenant = await createTenant(tenantPayload);

      if (!canManagePortalAccounts || !formData.createPortalAccount) {
        setSuccessMessage("Tenant added successfully.");
        setIsFormOpen(false);
        setFormData(getEmptyForm());
        await loadData();
        return;
      }

      const accountPayload = {
        tenantId: createdTenant.tenantId,
        username: formData.temporaryUsername.trim(),
      };

      try {
        await createTenantAccount(accountPayload);

        setSuccessMessage(
          "Tenant and portal account created. Activation email sent to the Tenant."
        );
      } catch (accountError) {
        setAccountRecovery({
          tenantId: createdTenant.tenantId,
          tenantName: createdTenant.name,
          username: accountPayload.username,
        });

        setError(
          getErrorMessage(
            accountError,
            "Tenant was created, but portal account creation failed. Use Retry Account Creation."
          )
        );
      }

      setIsFormOpen(false);
      setEditingTenantId(null);
      setFormData(getEmptyForm());
      await loadData();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to create tenant details."
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const retryAccountCreation = async () => {
    if (!accountRecovery) {
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      await createTenantAccount({
        tenantId: accountRecovery.tenantId,
        username: accountRecovery.username,
      });

      setAccountRecovery(null);
      setSuccessMessage("Portal account created successfully.");
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to create the portal account."
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openPortalAccountModal = (tenant) => {
    setPortalAccountTenant(tenant);
    setPortalUsername(tenant.mobileNumber || "");
    setError("");
    setSuccessMessage("");
  };

  const closePortalAccountModal = () => {
    if (isCreatingPortalAccount) return;
    setPortalAccountTenant(null);
    setPortalUsername("");
  };

  const handleCreatePortalAccount = async () => {
    if (!portalAccountTenant) return;

    const normalizedUsername = portalUsername.trim().toLowerCase();
    if (!normalizedUsername) {
      setError("Portal username is required.");
      return;
    }
    if (normalizedUsername.length < 4 || normalizedUsername.length > 100) {
      setError("Portal username must contain between 4 and 100 characters.");
      return;
    }

    try {
      setIsCreatingPortalAccount(true);
      setError("");
      await createTenantAccount({
        tenantId: portalAccountTenant.tenantId,
        username: normalizedUsername,
      });

      const tenantName = portalAccountTenant.name;
      setPortalAccountTenant(null);
      setPortalUsername("");
      setSuccessMessage(
        `Portal account created for ${tenantName}. The activation email has been sent.`
      );
      await loadData();
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Unable to create the portal account.")
      );
    } finally {
      setIsCreatingPortalAccount(false);
    }
  };

  const handleMarkLeft = async (tenant) => {

    try {
      setProcessingTenantId(tenant.tenantId);
      setError("");
      setSuccessMessage("");

      await markTenantAsLeft(tenant.tenantId);
      setDepartureTenant(null);
      setSuccessMessage(`${tenant.name} has been marked as LEFT.`);
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to update tenant status."));
    } finally {
      setProcessingTenantId(null);
    }
  };

  const getBuildingName = (tenant) => {
    const room = rooms.find(
      (item) => String(item.roomId) === String(tenant.roomId)
    );

    return room?.buildingName || "Building unavailable";
  };

  const roomFor = (tenant) => rooms.find((r) => String(r.roomId) === String(tenant.roomId));
  const labelStyle = "text-[11px] font-semibold text-[#64748B]";
  const buttonStyle = "rounded-lg border border-[#D8E2EA] bg-white px-3 py-2 text-xs font-semibold text-[#183B5B] hover:bg-[#EFF5F9] disabled:opacity-50";

  return (
    <main className="min-h-screen bg-[var(--pg-bg,#F7F5EF)] px-4 py-6 text-[#183B5B] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminHeader title="Tenants" subtitle="Find residents and manage their room assignments." />
        <section className="mt-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-bold">Resident directory</h2>
              <p className="mt-1 text-xs text-[#64748B]">{isLoading ? "Loading records..." : `${visibleTenants.length} matching residents`}</p>
            </div>
            {canManageTenants && <button type="button" onClick={openCreateForm} disabled={!rooms.length} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#183B5B] px-5 text-sm font-semibold text-white hover:bg-[#102F4B] disabled:opacity-50"><Plus size={17} strokeWidth={2} />Add tenant</button>}
          </div>
          <div className="mt-4 grid gap-3 rounded-xl border border-[#D9E3EA] bg-white p-4 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1.4fr)_repeat(3,minmax(130px,1fr))]">
            <label className="block min-w-0">
              <span className={labelStyle}>Search resident or mobile</span>
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone or room" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#CDD8E3] px-3 text-sm outline-none focus:border-[#183B5B]" />
            </label>
            <NanduSelect label="Status" value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
            <NanduSelect label="Building" value={buildingFilter} options={buildingOptions} onChange={(v) => {setBuildingFilter(v); setRoomFilter("");}} />
            <NanduSelect label="Room" value={roomFilter} options={roomOptions} onChange={setRoomFilter} disabled={!roomsForSelectedBuilding.length} />
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button type="button" className={buttonStyle} onClick={clearFilters}>Clear filters</button>
            <button type="button" className={buttonStyle} onClick={loadData} disabled={isLoading}>{isLoading ? "Refreshing..." : "Refresh"}</button>
          </div>
        </section>
        {error && !isFormOpen && !portalAccountTenant && !departureTenant && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {successMessage && <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{successMessage}</div>}
        {accountRecovery && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><span>Portal account pending for <strong>{accountRecovery.tenantName}</strong>. The tenant record was saved.</span><button type="button" className={buttonStyle} onClick={retryAccountCreation} disabled={isSaving}>{isSaving ? "Creating..." : "Retry account creation"}</button></div>}

        <section className="mt-5 overflow-hidden rounded-xl border border-[#D9E3EA] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[790px] border-collapse text-left text-sm">
              <thead className="bg-[#E8F0F7] text-[11px] font-bold uppercase tracking-wider text-[#183B5B]">
                <tr><th className="px-4 py-3">Resident</th><th className="px-4 py-3">Building / room</th><th className="px-4 py-3">Joining date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Portal</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBF0]">
                {isLoading ? <tr><td colSpan={6} className="px-4 py-12 text-center text-[#64748B]">Loading tenants...</td></tr> : visibleTenants.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-[#64748B]">No matching residents. Try clearing filters.</td></tr> : visibleTenants.map((tenant) => {
                  const room = roomFor(tenant);
                  const active = tenant.tenantStatus === "ACTIVE";
                  return <tr key={tenant.tenantId} className="hover:bg-[#F5F9FC]">
                    <td className="px-4 py-3"><p className="font-semibold text-[#183B5B]">{tenant.name}</p><p className="mt-1 text-xs text-[#64748B]">{tenant.mobileNumber}</p></td>
                    <td className="px-4 py-3"><p>{room?.buildingName || getBuildingName(tenant)}</p><p className="mt-1 text-xs text-[#64748B]">Room {room?.roomNumber || tenant.roomNumber || "—"} · {room?.roomType === "AC" ? "AC" : "Non-AC"}</p></td>
                    <td className="px-4 py-3 text-[#475569]">{tenant.joiningDate || "—"}</td>
                    <td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{tenant.tenantStatus || "—"}</span></td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">{!tenant.portalAccountCreated ? "Not created" : tenant.portalAccountActive ? "Active" : "Pending activation"}</td>
                    <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-1.5">
                      {canManageTenants && <button className={buttonStyle} type="button" onClick={() => openEditForm(tenant)}>Edit</button>}
                      {canManagePortalAccounts && active && !tenant.portalAccountCreated && <button className={buttonStyle} type="button" onClick={() => openPortalAccountModal(tenant)}>Portal</button>}
                      {canManageTenants && active && <button className={buttonStyle} type="button" disabled={processingTenantId === tenant.tenantId} onClick={() => { setError(""); setDepartureTenant(tenant); }}>{processingTenantId === tenant.tenantId ? "Updating..." : "Mark left"}</button>}
                      {!canManageTenants && <span className="text-xs text-[#94A3B8]">View only</span>}
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0E253C]/55 p-3 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) closeForm(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="tenant-form-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[#CDD8E3] bg-white shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#D9E3EA] px-5 py-4 sm:px-7">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#52718D]">Resident management</p>
                <h2 id="tenant-form-title" className="mt-1 text-xl font-bold text-[#183B5B]">{editingTenantId ? "Edit tenant" : "Add tenant"}</h2>
                <p className="mt-1 text-sm text-[#64748B]">{editingTenantId ? "Update the resident without resetting their joining date." : "Record the actual move-in date and select an assigned room."}</p>
              </div>
              <button type="button" onClick={closeForm} disabled={isSaving} aria-label="Close tenant form" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D9E3EA] text-[#183B5B] hover:bg-[#E8F0F7] disabled:opacity-50"><X size={19} strokeWidth={2} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
                {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={FIELD_LABEL}>Tenant name *<input name="name" value={formData.name} onChange={handleFormChange} placeholder="Enter tenant name" required className={INPUT_CLASS} /></label>
                  <label className={FIELD_LABEL}>Mobile number *<input name="mobileNumber" type="tel" value={formData.mobileNumber} onChange={handleFormChange} placeholder="Enter mobile number" required className={INPUT_CLASS} /></label>
                  <label className={FIELD_LABEL}>Email (optional)<input name="email" type="email" value={formData.email} onChange={handleFormChange} placeholder="Leave blank if not provided" className={INPUT_CLASS} /></label>
                  <label className={FIELD_LABEL}>Actual joining date *<input name="joiningDate" type="date" value={formData.joiningDate} onChange={handleFormChange} required className={INPUT_CLASS} /></label>
                  <div className="min-w-0"><NanduSelect label="Building *" value={formData.buildingId} options={formBuildingOptions} onChange={(value) => setFormData((current) => ({ ...current, buildingId: value, roomId: "" }))} placeholder="Select building" disabled={!buildings.length} /></div>
                  <div className="min-w-0"><NanduSelect label="Room *" value={formData.roomId} options={assignRoomOptions} onChange={(value) => setFormData((current) => ({ ...current, roomId: value }))} placeholder={formData.buildingId ? "Select room" : "Select building first"} disabled={!formData.buildingId || !formRooms.length} /></div>
                </div>
                <p className="text-xs text-[#64748B]">Room choices depend on the selected building. Confirm availability before saving.</p>
                {!editingTenantId && canManagePortalAccounts && (
                  <div className="rounded-lg border border-[#D9E3EA] bg-[#E8F0F7] p-4">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input name="createPortalAccount" type="checkbox" checked={formData.createPortalAccount} onChange={handleFormChange} className="mt-0.5 h-4 w-4 accent-[#183B5B]" />
                      <span><span className="block text-sm font-semibold text-[#183B5B]">Create portal account</span><span className="mt-1 block text-xs text-[#64748B]">ADMIN only. An activation email is sent through the existing flow.</span></span>
                    </label>
                    {formData.createPortalAccount && <label className={`${FIELD_LABEL} mt-4 block`}>Temporary username *<input name="temporaryUsername" value={formData.temporaryUsername} onChange={handleFormChange} autoComplete="off" placeholder="Enter username" className={INPUT_CLASS} /></label>}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#D9E3EA] bg-white px-5 py-4 sm:px-7">
                <button type="button" onClick={closeForm} disabled={isSaving} className={SECONDARY}>Cancel</button>
                <button type="submit" disabled={isSaving} className={PRIMARY}>{isSaving ? "Saving…" : editingTenantId ? "Save changes" : "Save tenant"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {portalAccountTenant && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0E253C]/55 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) closePortalAccountModal(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="portal-dialog-title" className="w-full max-w-lg rounded-xl border border-[#D9E3EA] bg-white shadow-2xl">
            <div className="border-b border-[#D9E3EA] px-6 py-5">
              <h2 id="portal-dialog-title" className="text-xl font-bold text-[#183B5B]">Create portal account</h2>
              <p className="mt-1 text-sm text-[#64748B]">Grant the resident access using the existing activation flow.</p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg bg-[#E8F0F7] p-4 text-sm"><p className="font-semibold text-[#183B5B]">{portalAccountTenant.name}</p><p className="mt-1 break-all text-[#64748B]">{portalAccountTenant.email || "No email provided"}</p></div>
              {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
              <label className={FIELD_LABEL}>Portal username *<input value={portalUsername} onChange={(e) => setPortalUsername(e.target.value)} maxLength={100} autoComplete="off" className={INPUT_CLASS} /></label>
              <p className="text-xs text-[#64748B]">Confirm the registered email with the resident before sending an activation link.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#D9E3EA] px-6 py-4">
              <button type="button" onClick={closePortalAccountModal} disabled={isCreatingPortalAccount} className={SECONDARY}>Cancel</button>
              <button type="button" onClick={handleCreatePortalAccount} disabled={isCreatingPortalAccount} className={PRIMARY}>{isCreatingPortalAccount ? "Creating…" : "Create account"}</button>
            </div>
          </section>
        </div>
      )}

      {departureTenant && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#0E253C]/55 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !processingTenantId) setDepartureTenant(null); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="departure-dialog-title" className="w-full max-w-md rounded-xl border border-[#D9E3EA] bg-white shadow-2xl">
            <div className="px-6 py-5"><h2 id="departure-dialog-title" className="text-xl font-bold text-[#183B5B]">Mark resident as left?</h2><p className="mt-3 text-sm leading-relaxed text-[#64748B]"><strong className="text-[#183B5B]">{departureTenant.name}</strong> will no longer count as an active resident. Their history will be preserved.</p>{error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}</div>
            <div className="flex justify-end gap-2 border-t border-[#D9E3EA] px-6 py-4"><button type="button" onClick={() => setDepartureTenant(null)} disabled={!!processingTenantId} className={SECONDARY}>Cancel</button><button type="button" onClick={() => handleMarkLeft(departureTenant)} disabled={!!processingTenantId} className="inline-flex min-h-11 items-center rounded-lg bg-[#B33A3A] px-5 text-sm font-semibold text-white hover:bg-[#922D2D] disabled:opacity-50">{processingTenantId ? "Updating…" : "Confirm departure"}</button></div>
          </section>
        </div>
      )}
    </main>
  );
}
