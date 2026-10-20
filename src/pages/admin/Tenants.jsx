import { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

import AdminHeader from "../../components/admin/AdminHeader.jsx";
import PremiumSelect from "../../components/admin/PremiumSelect.jsx";
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
  createPortalAccount: true,
  temporaryUsername: "",
});

const INPUT_CLASS =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-sm text-stone-900 outline-none transition-all duration-300 placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-600 focus:bg-white focus:ring-4 focus:ring-stone-100";

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

      return matchesStatus && matchesBuilding && matchesRoom;
    });
  }, [tenants, rooms, statusFilter, buildingFilter, roomFilter]);

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
      formData.createPortalAccount &&
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

      if (!formData.createPortalAccount) {
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
    const shouldContinue = window.confirm(
      `Mark ${tenant.name} as LEFT? The tenant history will be preserved.`
    );

    if (!shouldContinue) {
      return;
    }

    try {
      setProcessingTenantId(tenant.tenantId);
      setError("");
      setSuccessMessage("");

      await markTenantAsLeft(tenant.tenantId);
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

  return (
    <main className="min-h-screen bg-[#F5F5F0] px-4 py-6 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminHeader
          title="Tenants"
          subtitle="Manage residents, room allocation, and tenant history."
        />

        <section className="mt-7 rounded-[2rem] border border-stone-200/70 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PremiumSelect
                label="Tenant Status"
                value={statusFilter}
                options={statusOptions}
                onChange={setStatusFilter}
              />

              <PremiumSelect
                label="Building"
                value={buildingFilter}
                options={buildingOptions}
                onChange={(value) => {
                  setBuildingFilter(value);
                  setRoomFilter("");
                }}
              />

              <PremiumSelect
                label="Room"
                value={roomFilter}
                options={roomOptions}
                onChange={setRoomFilter}
                disabled={roomsForSelectedBuilding.length === 0}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={clearFilters}
                className="rounded-full border border-stone-300 bg-white px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-stone-700 shadow-sm transition-all duration-300 hover:border-stone-700 hover:shadow-md"
              >
                Reset Filters
              </motion.button>

              {canManageTenants && (
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={openCreateForm}
                  disabled={rooms.length === 0}
                  className="rounded-full bg-stone-900 px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-white shadow-sm transition-all duration-300 hover:bg-stone-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Tenant
                </motion.button>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
                Matching Residents
              </p>
              <p className="mt-1 text-2xl font-black tracking-tighter">
                {visibleTenants.length}
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-[8px] font-bold uppercase tracking-widest text-stone-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-stone-700 hover:shadow-md active:scale-[0.97] disabled:opacity-50"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {successMessage}
          </div>
        )}

        {accountRecovery && (
          <section className="mt-5 rounded-2xl border border-stone-300 bg-white p-5 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
              Portal Account Pending
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tighter">
              {accountRecovery.tenantName}
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              The tenant record exists, but portal access still needs to be created.
            </p>
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              disabled={isSaving}
              onClick={retryAccountCreation}
              className="mt-4 rounded-full bg-stone-900 px-5 py-2.5 text-[8px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
            >
              {isSaving ? "Creating..." : "Retry Account Creation"}
            </motion.button>
          </section>
        )}

        {isLoading ? (
          <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-[2rem] border border-stone-200 bg-white"
              />
            ))}
          </section>
        ) : visibleTenants.length === 0 ? (
          <section className="mt-6 rounded-[2rem] border border-stone-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-black tracking-tighter">
              No tenants match these filters
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
              Change the tenant status, building, or room selection to review
              other residents.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-full border border-stone-300 bg-white px-6 py-3 text-[9px] font-bold uppercase tracking-widest transition-all duration-300 hover:-translate-y-0.5 hover:border-stone-900 hover:shadow-md active:scale-[0.97]"
            >
              Clear Filters
            </button>
          </section>
        ) : (
          <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTenants.map((tenant, index) => (
              <motion.article
                key={tenant.tenantId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="flex min-h-72 flex-col rounded-[2rem] border border-stone-200/70 bg-white p-6 shadow-[0_15px_35px_-24px_rgba(28,25,23,0.25)] transition-shadow duration-300 hover:shadow-[0_20px_45px_-25px_rgba(28,25,23,0.35)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-stone-400">
                      {getBuildingName(tenant)}
                    </p>
                    <p className="text-sm text-stone-500">
                      Room {tenant.roomNumber} ·{" "}
                      {tenant.roomType === "AC" ? "AC" : "Non-AC"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1.5 text-[7px] font-bold uppercase tracking-widest ${tenant.tenantStatus === "ACTIVE"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-stone-200 bg-stone-100 text-stone-600"
                      }`}
                  >
                    {tenant.tenantStatus}
                  </span>
                </div>

                <h2 className="mt-6 text-2xl font-black tracking-tighter">
                  {tenant.name}
                </h2>

                <div className="mt-4 space-y-2 text-sm text-stone-500">
                  <p>{tenant.mobileNumber}</p>
                  {tenant.email && <p className="break-all">{tenant.email}</p>}
                </div>
                <div className="mt-4">
                  {!tenant.portalAccountCreated && (
                    <span className="inline-flex rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-[7px] font-bold uppercase tracking-widest text-stone-600">
                      Portal Not Created
                    </span>
                  )}
                  {tenant.portalAccountCreated && !tenant.portalAccountActive && (
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[7px] font-bold uppercase tracking-widest text-amber-700">
                      Activation Pending
                    </span>
                  )}
                  {tenant.portalAccountCreated && tenant.portalAccountActive && (
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[7px] font-bold uppercase tracking-widest text-emerald-700">
                      Portal Active
                    </span>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap gap-3 pt-7">
                  {canManageTenants && (
                    <motion.button
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => openEditForm(tenant)}
                      className="flex-1 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-[8px] font-bold uppercase tracking-widest text-stone-700 shadow-sm transition-all duration-300 hover:border-stone-800 hover:shadow-md"
                    >
                      Edit
                    </motion.button>
                  )}

                  

                  {canManageTenants && tenant.tenantStatus === "ACTIVE" &&
                    !tenant.portalAccountCreated && (
                      <motion.button
                        type="button"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => openPortalAccountModal(tenant)}
                        className="w-full rounded-full bg-stone-900 px-4 py-2.5 text-[8px] font-bold uppercase tracking-widest text-white shadow-sm transition-all duration-300 hover:bg-stone-800 hover:shadow-md"
                      >
                        Create Portal Account
                      </motion.button>
                    )}

                  {canManageTenants && tenant.tenantStatus === "ACTIVE" && (
                    <motion.button
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={processingTenantId === tenant.tenantId}
                      onClick={() => handleMarkLeft(tenant)}
                      className="flex-1 rounded-full border border-stone-900 bg-white px-4 py-2.5 text-[8px] font-bold uppercase tracking-widest text-stone-900 shadow-sm transition-all duration-300 hover:border-stone-900 hover:bg-stone-900 hover:text-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processingTenantId === tenant.tenantId
                        ? "Updating..."
                        : "Mark Left"}
                    </motion.button>
                  )}
                </div>
              </motion.article>
            ))}
          </section>
        )}
      </div>

      {isFormOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm"
          onClick={closeForm}
        >
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="max-h-full w-full max-w-xl overflow-y-auto rounded-[2rem] border border-stone-200 bg-white p-6 shadow-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">
                  {editingTenantId ? "Update Resident" : "New Resident"}
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tighter">
                  {editingTenantId ? "Edit tenant details" : "Add a tenant"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition-all duration-300 hover:rotate-90 hover:bg-stone-200 active:scale-95"
                aria-label="Close tenant form"
              >
                X
              </button>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <label className="block">
                <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-stone-500">
                  Tenant Name
                </span>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Enter tenant name"
                  className={INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-stone-500">
                  Mobile Number
                </span>
                <input
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleFormChange}
                  placeholder="Enter mobile number"
                  className={INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-stone-500">
                  Email <span className="text-stone-400">(Optional)</span>
                </span>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="Enter email address"
                  className={INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-stone-500">
                  Joining Date
                </span>

                <input
                  name="joiningDate"
                  type="date"
                  value={formData.joiningDate}
                  onChange={handleFormChange}
                  className={INPUT_CLASS}
                  required
                />

                <span className="mt-2 block text-xs leading-relaxed text-stone-400">
                  Actual date the resident moved into the PG.
                </span>
              </label>

              <PremiumSelect
                label="Building"
                value={formData.buildingId}
                options={formBuildingOptions}
                onChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    buildingId: value,
                    roomId: "",
                  }))
                }
                placeholder="Select a building"
                disabled={buildings.length === 0}
              />

              <PremiumSelect
                label="Assign Room"
                value={formData.roomId}
                options={assignRoomOptions}
                onChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    roomId: value,
                  }))
                }
                placeholder={
                  formData.buildingId
                    ? "Select a room"
                    : "Select a building first"
                }
                disabled={!formData.buildingId || formRooms.length === 0}
              />

              {!editingTenantId && (
                <section className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-stone-500">
                        Create Portal Account
                      </span>
                      <span className="mt-1 block text-xs text-stone-500">
                        Send a secure account activation link to the Tenant email.
                      </span>
                    </div>
                    <input
                      name="createPortalAccount"
                      type="checkbox"
                      checked={formData.createPortalAccount}
                      onChange={handleFormChange}
                      className="h-5 w-5 accent-stone-900"
                    />
                  </label>

                  {formData.createPortalAccount && (
                    <div className="mt-5 space-y-4 border-t border-stone-200 pt-5">
                      <label className="block">
                        <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-stone-500">
                          Temporary Username
                        </span>
                        <input
                          name="temporaryUsername"
                          value={formData.temporaryUsername}
                          onChange={handleFormChange}
                          placeholder="Defaults to mobile number"
                          autoComplete="off"
                          className={INPUT_CLASS}
                        />
                      </label>


                    </div>
                  )}
                </section>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={closeForm}
                  className="rounded-full border border-stone-300 bg-white px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-stone-700 transition-all duration-300 hover:border-stone-900 hover:shadow-md"
                >
                  Cancel
                </motion.button>

                <motion.button
                  type="submit"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={isSaving}
                  className="rounded-full bg-stone-900 px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-white shadow-sm transition-all duration-300 hover:bg-stone-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? "Saving..."
                    : editingTenantId
                      ? "Update Tenant"
                      : "Add Tenant"}
                </motion.button>
              </div>
            </form>
          </motion.section>
        </div>
      )}
      <AnimatePresence>
        {portalAccountTenant && (
          <motion.div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl"
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">Tenant Portal Access</p>
              <h2 className="mt-2 text-3xl font-black tracking-tighter">Create portal account</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">An activation link will be sent to the registered Tenant email address.</p>

              <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-5">
                <p className="font-black text-stone-900">{portalAccountTenant.name}</p>
                <p className="mt-1 break-all text-sm text-stone-500">{portalAccountTenant.email}</p>
                <p className="mt-1 text-xs text-stone-400">Room {portalAccountTenant.roomNumber || "Not assigned"}</p>
              </div>

              <label className="mt-6 block">
                <span className="mb-2 block text-[9px] font-bold uppercase tracking-widest text-stone-500">Portal Username</span>
                <input
                  type="text"
                  value={portalUsername}
                  onChange={(event) => setPortalUsername(event.target.value)}
                  maxLength={100}
                  autoComplete="off"
                  placeholder="Enter portal username"
                  className={INPUT_CLASS}
                />
              </label>

              <div className="mt-5 rounded-2xl bg-stone-100 p-4">
                <p className="text-xs leading-relaxed text-stone-600">Confirm the registered email with the Tenant before creating the account. The Tenant will create a private password using the activation link.</p>
              </div>

              <div className="mt-7 flex justify-end gap-3">
                <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={closePortalAccountModal} disabled={isCreatingPortalAccount} className="rounded-full border border-stone-300 bg-white px-5 py-3 text-[8px] font-bold uppercase tracking-widest text-stone-700 disabled:opacity-50">Cancel</motion.button>
                <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={handleCreatePortalAccount} disabled={isCreatingPortalAccount} className="rounded-full bg-stone-900 px-5 py-3 text-[8px] font-bold uppercase tracking-widest text-white disabled:opacity-50">
                  {isCreatingPortalAccount ? "Creating..." : "Create and Send Email"}
                </motion.button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
