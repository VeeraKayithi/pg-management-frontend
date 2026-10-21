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
  const signOut = () => {
    logoutUser();
    navigate("/login", { replace: true });
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
