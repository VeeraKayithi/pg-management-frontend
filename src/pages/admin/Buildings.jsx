import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

import AdminHeader from "../../components/admin/AdminHeader.jsx";
import ActionButton from "../../components/admin/ActionButton.jsx";
import PremiumSelect from "../../components/admin/PremiumSelect.jsx";
import { createBuilding, deleteBuilding, getAllBuildings, updateBuilding, } from "../../services/buildingService.js";
import useAutoDismiss from "../../hooks/useAutoDismiss.js";
import { getRole } from "../../services/authService.js";

const EMPTY_FORM = {
  buildingName: "",
  buildingType: "MENS_PG",
  address: "",
  city: "Hyderabad",
};

const BUILDING_TYPES = [
  { value: "MENS_PG", label: "Men's PG" },
  { value: "WOMENS_PG", label: "Women's PG" },
];

const INPUT_CLASS =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-sm text-stone-900 outline-none transition-all duration-200 placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-700 focus:bg-white focus:ring-4 focus:ring-stone-100";

function errorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function Buildings() {
  const [buildings, setBuildings] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const role = getRole()
    ?.replace("ROLE_", "")
    ?.toUpperCase();

  const isSuperAdmin = role === "ADMIN";

  const canEditBuilding =
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

  const loadBuildings = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAllBuildings();
      setBuildings(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to load buildings."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuildings();
  }, []);

  const changeField = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setError("");
    setMessage("");
    setFormOpen(true);
  };

  const openEdit = (building) => {
    setEditingId(building.buildingId);
    setFormData({
      buildingName: building.buildingName || "",
      buildingType: building.buildingType || "MENS_PG",
      address: building.address || "",
      city: building.city || "Hyderabad",
    });
    setError("");
    setMessage("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      buildingName: formData.buildingName.trim(),
      buildingType: formData.buildingType,
      address: formData.address.trim(),
      city: formData.city.trim(),
    };

    if (!payload.buildingName || !payload.address || !payload.city) {
      setError("Please complete all building fields.");
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await updateBuilding(editingId, payload);
        setMessage("Building updated successfully.");
      } else {
        await createBuilding(payload);
        setMessage("Building created successfully.");
      }
      setFormOpen(false);
      await loadBuildings();
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to save building."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (building) => {
    if (!window.confirm(`Delete ${building.buildingName}?`)) return;

    try {
      setProcessingId(building.buildingId);
      setError("");
      setMessage("");
      await deleteBuilding(building.buildingId);
      setMessage("Building deleted successfully.");
      await loadBuildings();
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to delete building."));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F0] px-4 py-6 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminHeader title="Buildings" subtitle="Create and maintain PG campuses." />

        <section className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
              Registered Campuses
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tighter">
              {buildings.length} buildings
            </h2>
          </div>

          <div className="flex gap-3">
            

            {isSuperAdmin && (
              <ActionButton onClick={openCreate} variant="primary">
                Add Building
              </ActionButton>
            )}
          </div>
        </section>

        {error && (
          <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </p>
        )}

        {loading ? (
          <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-64 animate-pulse rounded-[2rem] bg-white" />
            ))}
          </section>
        ) : (
          <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.map((building, index) => (
              <motion.article
                key={building.buildingId}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ delay: index * 0.05 }}
                className="flex min-h-64 flex-col rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1.5 text-[8px] font-bold uppercase tracking-widest text-stone-600">
                    {building.buildingType}
                  </span>
                  <span className="text-xs font-bold text-stone-300">#{building.buildingId}</span>
                </div>

                <h3 className="mt-6 text-3xl font-black tracking-tighter">
                  {building.buildingName}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-500">
                  {[building.address, building.city].filter(Boolean).join(", ")}
                </p>

                {(canEditBuilding || isSuperAdmin) && (
                  <div className="mt-auto flex gap-3 pt-8">

                    {canEditBuilding && (
                      <ActionButton
                        onClick={() => openEdit(building)}
                        className="flex-1"
                      >
                        Edit
                      </ActionButton>
                    )}

                    {isSuperAdmin && (
                      <ActionButton
                        onClick={() => remove(building)}
                        disabled={processingId === building.buildingId}
                        variant="danger"
                        className="flex-1"
                      >
                        {processingId === building.buildingId
                          ? "Deleting..."
                          : "Delete"}
                      </ActionButton>
                    )}

                  </div>
                )}
              </motion.article>
            ))}
          </section>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm" onClick={closeForm}>
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-xl rounded-[2rem] bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-3xl font-black tracking-tighter">
                {editingId ? "Edit building" : "Add building"}
              </h2>
              <ActionButton onClick={closeForm} variant="soft">Close</ActionButton>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-5">
              <input name="buildingName" value={formData.buildingName} onChange={changeField} placeholder="Building name" className={INPUT_CLASS} />

              <PremiumSelect
                label="Building Type"
                value={formData.buildingType}
                options={BUILDING_TYPES}
                onChange={(value) => setFormData((current) => ({ ...current, buildingType: value }))}
              />

              <textarea name="address" value={formData.address} onChange={changeField} placeholder="Address" rows="3" className={`${INPUT_CLASS} resize-none`} />
              <input name="city" value={formData.city} onChange={changeField} placeholder="City" className={INPUT_CLASS} />

              <div className="flex justify-end gap-3 pt-2">
                <ActionButton onClick={closeForm}>Cancel</ActionButton>
                <ActionButton type="submit" disabled={saving} variant="primary">
                  {saving ? "Saving..." : "Save Building"}
                </ActionButton>
              </div>
            </form>
          </motion.section>
        </div>
      )}
    </main>
  );
}
