import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { motion } from "framer-motion";

import AdminHeader from "../../components/admin/AdminHeader.jsx";
import ActionButton from "../../components/admin/ActionButton.jsx";
import PremiumSelect from "../../components/admin/PremiumSelect.jsx";

import { getAllBuildings } from "../../services/buildingService.js";

import {
  createStaffAccount,
  getStaffAccounts,
  updateStaffAccountStatus,
} from "../../services/userService.js";

import useAutoDismiss from "../../hooks/useAutoDismiss.js";

const EMPTY_FORM = {
  username: "",
  password: "",
  role: "BUILDING_ADMIN",
  buildingId: "",
};

const ROLE_OPTIONS = [
  {
    value: "BUILDING_ADMIN",
    label: "Building Admin",
  },
  {
    value: "SUPERVISOR",
    label: "Supervisor",
  },
];

const INPUT_CLASS =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-sm text-stone-900 outline-none transition-all duration-200 placeholder:text-stone-400 hover:border-stone-400 focus:border-stone-700 focus:bg-white focus:ring-4 focus:ring-stone-100";

function errorMessage(error, fallback) {
  const data = error.response?.data;

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (data && typeof data === "object") {
    const firstValidationMessage =
      Object.values(data)[0];

    if (
      typeof firstValidationMessage === "string"
    ) {
      return firstValidationMessage;
    }
  }

  return fallback;
}

export default function StaffAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [processingId, setProcessingId] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [formOpen, setFormOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const clearError = useCallback(() => {
    setError("");
  }, []);

  const clearMessage = useCallback(() => {
    setMessage("");
  }, []);

  useAutoDismiss(
    error,
    clearError,
    4000
  );

  useAutoDismiss(
    message,
    clearMessage,
    4000
  );

  const toggleStatus = async (account) => {
    const newStatus = !account.active;

    const action =
      newStatus ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${account.username}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(account.userId);
      setError("");
      setMessage("");

      await updateStaffAccountStatus(
        account.userId,
        newStatus
      );

      setMessage(
        `Staff account ${newStatus
          ? "activated"
          : "deactivated"
        } successfully.`
      );

      await loadData();
    } catch (requestError) {
      setError(
        errorMessage(
          requestError,
          "Unable to update staff account."
        )
      );
    } finally {
      setProcessingId(null);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        accountData,
        buildingData,
      ] = await Promise.all([
        getStaffAccounts(),
        getAllBuildings(),
      ]);

      setAccounts(
        Array.isArray(accountData)
          ? accountData
          : []
      );

      setBuildings(
        Array.isArray(buildingData)
          ? buildingData
          : []
      );
    } catch (requestError) {
      setError(
        errorMessage(
          requestError,
          "Unable to load staff accounts."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const buildingOptions =
    useMemo(
      () =>
        buildings.map(
          (building) => ({
            value:
              building.buildingId,
            label:
              building.buildingName,
          })
        ),
      [buildings]
    );

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      buildingId:
        buildings[0]
          ?.buildingId || "",
    });

    setError("");
    setMessage("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setForm(EMPTY_FORM);
  };

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const payload = {
      username:
        form.username.trim(),
      password:
        form.password,
      role:
        form.role,
      buildingId:
        Number(form.buildingId),
    };

    if (
      !payload.username ||
      !payload.password ||
      !payload.buildingId
    ) {
      setError(
        "Please complete all staff account fields."
      );
      return;
    }

    try {
      setSaving(true);

      await createStaffAccount(
        payload
      );

      setMessage(
        "Staff account created successfully."
      );

      setFormOpen(false);
      setForm(EMPTY_FORM);

      await loadData();
    } catch (requestError) {
      setError(
        errorMessage(
          requestError,
          "Unable to create staff account."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F0] px-4 py-6 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-7xl">

        <AdminHeader
          title="Staff Accounts"
          subtitle="Manage Building Admin and Supervisor access."
        />

        <section className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
              Management Accounts
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tighter">
              {accounts.length} staff accounts
            </h2>
          </div>

          <ActionButton
            onClick={openCreate}
            variant="primary"
            disabled={
              buildings.length === 0
            }
          >
            Add Staff Account
          </ActionButton>

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

            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="h-52 animate-pulse rounded-[2rem] bg-white"
                />
              )
            )}

          </section>
        ) : accounts.length === 0 ? (

          <section className="mt-6 rounded-[2rem] border border-stone-200 bg-white p-10 text-center shadow-sm">

            <p className="text-sm font-semibold text-stone-500">
              No staff accounts have been created yet.
            </p>

          </section>

        ) : (

          <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {accounts.map(
              (account, index) => (

                <motion.article
                  key={account.userId}
                  initial={{
                    opacity: 0,
                    y: 14,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  whileHover={{
                    y: -4,
                  }}
                  transition={{
                    delay:
                      index * 0.04,
                  }}
                  className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
                >

                  <div className="flex items-start justify-between gap-4">

                    <span className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1.5 text-[8px] font-bold uppercase tracking-widest text-stone-600">

                      {account.role ===
                        "BUILDING_ADMIN"
                        ? "Building Admin"
                        : "Supervisor"}

                    </span>

                    <span
                      className={`rounded-full px-3 py-1.5 text-[8px] font-bold uppercase tracking-widest ${account.active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-stone-100 text-stone-500"
                        }`}
                    >
                      {account.active
                        ? "Active"
                        : "Inactive"}
                    </span>

                  </div>

                  <h3 className="mt-6 text-2xl font-black tracking-tighter">

                    {account.username}

                  </h3>

                  <p className="mt-3 text-sm text-stone-500">

                    {account.buildingName}

                  </p>

                  <div className="mt-6 border-t border-stone-100 pt-5">
                    <ActionButton
                      onClick={() =>
                        toggleStatus(account)
                      }
                      disabled={
                        processingId === account.userId
                      }
                      variant={
                        account.active
                          ? "danger"
                          : "primary"
                      }
                      className="w-full"
                    >
                      {processingId === account.userId
                        ? "Updating..."
                        : account.active
                          ? "Deactivate"
                          : "Activate"}
                    </ActionButton>
                  </div>

                  <p className="mt-1 text-xs text-stone-400">

                    Building ID #{account.buildingId}

                  </p>

                </motion.article>
              )
            )}

          </section>
        )}

      </div>

      {formOpen && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm"
          onClick={closeForm}
        >

          <motion.section
            initial={{
              opacity: 0,
              y: 18,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            className="w-full max-w-xl rounded-[2rem] bg-white p-7 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
                  User Management
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tighter">
                  Add staff account
                </h2>
              </div>

              <ActionButton
                onClick={closeForm}
                variant="soft"
              >
                Close
              </ActionButton>

            </div>

            <form
              onSubmit={submit}
              className="mt-7 space-y-5"
            >

              <input
                value={form.username}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      username:
                        event.target.value,
                    })
                  )
                }
                placeholder="Username"
                autoComplete="off"
                className={INPUT_CLASS}
              />

              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      password:
                        event.target.value,
                    })
                  )
                }
                placeholder="Password"
                autoComplete="new-password"
                className={INPUT_CLASS}
              />

              <PremiumSelect
                label="Role"
                value={form.role}
                options={ROLE_OPTIONS}
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      role: value,
                    })
                  )
                }
              />

              <PremiumSelect
                label="Building"
                value={
                  form.buildingId
                }
                options={
                  buildingOptions
                }
                onChange={(value) =>
                  setForm(
                    (current) => ({
                      ...current,
                      buildingId:
                        value,
                    })
                  )
                }
                placeholder="Select building"
              />

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">

                <p className="text-xs leading-relaxed text-stone-500">

                  Building Admin can manage the assigned building.
                  Supervisor receives read-only access.

                </p>

              </div>

              <div className="flex justify-end gap-3 pt-2">

                <ActionButton
                  onClick={closeForm}
                >
                  Cancel
                </ActionButton>

                <ActionButton
                  type="submit"
                  variant="primary"
                  disabled={saving}
                >
                  {saving
                    ? "Creating..."
                    : "Create Account"}
                </ActionButton>

              </div>

            </form>

          </motion.section>

        </div>
      )}

    </main>
  );
}