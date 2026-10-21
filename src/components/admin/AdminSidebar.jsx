
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  Users,
  MessageSquare,
  Bell,
  ShieldCheck,
  X,
} from "lucide-react";

import { getRole } from "../../services/authService.js";

const mainNavigation = [
  {
    label: "Overview",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Buildings",
    path: "/admin/buildings",
    icon: Building2,
  },
  {
    label: "Rooms",
    path: "/admin/rooms",
    icon: BedDouble,
  },
  {
    label: "Tenants",
    path: "/admin/tenants",
    icon: Users,
  },
  {
    label: "Communications",
    path: "/admin/communications",
    icon: MessageSquare,
  },
  {
    label: "Notifications",
    path: "/admin/notifications",
    icon: Bell,
  },
];

export default function AdminSidebar({
  isOpen = false,
  onClose = () => { },
}) {
  const role = getRole()
    ?.replace(/^ROLE_/i, "")
    ?.toUpperCase();

  const isSuperAdmin = role === "ADMIN";

  const navigation = [
    ...mainNavigation,
    ...(isSuperAdmin
      ? [{
        label: "Staff Accounts",
        path: "/admin/staff-accounts",
        icon: ShieldCheck,
      }]
      : []),
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        id="admin-sidebar"
        className={`
          fixed inset-y-0 left-0 z-50
          flex h-screen w-72 shrink-0 flex-col
          overflow-y-auto
          bg-[#183B5B] text-white
          shadow-xl transition-transform duration-300

         lg:fixed lg:inset-y-0 lg:left-0 lg:z-20
         lg:translate-x-0 lg:shadow-none

          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Branding */}
        <div className="border-b border-white/15 px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <NavLink
              to="/admin/dashboard"
              onClick={onClose}
              className="flex min-w-0 items-center gap-3"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-md">
                <img
                  src="/nandu_group_of_hostels_logo.svg"
                  alt="NANDU Group of Hostels"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight">
                  NANDU
                </h2>

                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-blue-100/80">
                  Management Portal
                </p>
              </div>
            </NavLink>

            <button
              type="button"
              aria-label="Close menu"
              onClick={onClose}
              className="rounded-lg p-2 text-white/80 hover:bg-white/10 lg:hidden"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Management navigation"
          className="flex-1 px-4 py-7"
        >
          <p className="mb-4 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200/70">
            Workspace
          </p>

          <div className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) => `
                    flex min-h-12 items-center gap-3
                    rounded-xl border-l-[3px]
                    px-4 py-3 text-sm
                    font-semibold transition-all duration-200

                    ${isActive
                      ? "border-[#E58B8B] bg-white/15 text-white shadow-sm"
                      : "border-transparent text-blue-100/80 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  <Icon
                    size={19}
                    strokeWidth={1.9}
                    className="shrink-0"
                  />

                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/15 px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-100/75">
            NANDU Group of Hostels
          </p>

          <p className="mt-1 text-[11px] text-blue-200/65">
            Hyderabad, Telangana
          </p>
        </div>
      </aside>
    </>
  );
}
