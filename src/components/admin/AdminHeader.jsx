import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { getRole, getUsername, logoutUser } from "../../services/authService.js";
import NotificationBell from "../notifications/NotificationBell.jsx";

const ROLE_LABELS = { ADMIN: "Super Admin", BUILDING_ADMIN: "Building Admin", SUPERVISOR: "Supervisor" };

// Rendered once by AdminLayout. Pages retain the default AdminHeader interface below.
export function AdminUtilityBar({ onOpenNavigation, navigationOpen, menuButtonRef }) {
  const navigate = useNavigate();
  const username = getUsername() || "Admin";
  const role = getRole()?.replace(/^ROLE_/i, "")?.toUpperCase();

  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isSigningOut) return;

    const timer = setTimeout(() => {
      navigate("/login", { replace: true });
    }, 1500);

    return () => clearTimeout(timer);
  }, [isSigningOut, navigate]);

  const signOut = () => {
    if (isSigningOut) return;

    logoutUser();
    setIsSigningOut(true);
  };

  return (
    <header className="nandu-utility">
      <button ref={menuButtonRef} type="button" className="nandu-icon-button nandu-menu-button"
        onClick={onOpenNavigation} aria-label="Open navigation menu"
        aria-controls="admin-sidebar" aria-expanded={navigationOpen}>
        <Menu size={21} aria-hidden="true" />
      </button>
      <span className="nandu-utility-context">Management workspace</span>
      <div className="nandu-user-tools">
        <div className="nandu-user-identity">
          <span className="nandu-username" title={username}>{username}</span>
          <span className="nandu-user-role">{ROLE_LABELS[role] || "Management"}</span>
        </div>
        <div className="nandu-notification-tool"><NotificationBell destination="/admin/notifications" /></div>
        <button type="button" onClick={signOut} className="nandu-icon-button" aria-label="Sign out" title="Sign out">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>

      {isSigningOut && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#F7F5EF]"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <img
              src="/nandu_group_of_hostels_logo.svg"
              alt="NANDU"
              className="h-[130px] w-[130px] object-contain sm:h-[150px] sm:w-[150px]"
            />

            <h2 className="mt-6 text-xl font-bold text-[#183B5B]">
              Signing you out
            </h2>

            <p className="mt-2 text-sm text-[#71889A]">
              See you again soon.
            </p>

            <div className="mt-6 h-1 w-36 overflow-hidden rounded-full bg-[#E0E8EF]">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.3, ease: "easeInOut" }}
                className="h-full rounded-full bg-[#183B5B]"
              />
            </div>
          </motion.div>
        </motion.div>
      )}

    </header>
  );
}

export default function AdminHeader({ title, subtitle, children }) {
  return (
    <header className="nandu-page-header">
      <div className="nandu-page-heading">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="nandu-page-actions">{children}</div>}
    </header>
  );
}
