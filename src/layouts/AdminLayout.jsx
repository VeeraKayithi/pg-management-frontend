import { useEffect, useRef, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import { AdminUtilityBar } from "../components/admin/AdminHeader.jsx";
import "../styles/admin-workspace.css";

export default function AdminLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const location = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!isSidebarOpen) return undefined;
    const sidebar = document.getElementById("admin-sidebar");
    const menuButton = menuButtonRef.current;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const priorOverflow = document.body.style.overflow;
    if (desktop.matches) { setSidebarOpen(false); return undefined; }
    document.body.style.overflow = "hidden";
    sidebar?.querySelector('button[aria-label="Close menu"]')?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); setSidebarOpen(false); }
      if (event.key !== "Tab") return;
      const controls = Array.from(sidebar?.querySelectorAll('a[href],button:not([disabled])') || [])
        .filter((element) => element.getClientRects().length > 0);
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const onResize = () => { if (desktop.matches) setSidebarOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = priorOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onResize);
      window.requestAnimationFrame(() => {
        if (menuButton?.getClientRects().length) menuButton.focus();
      });
    };
  }, [isSidebarOpen]);

  return (
    <div className="nandu-admin lg:flex">
      <a className="nandu-skip-link" href="#admin-workspace-content">Skip to content</a>
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div
        className="nandu-workspace lg:ml-72"
        inert={isSidebarOpen ? true : undefined}
      >
        <AdminUtilityBar onOpenNavigation={() => setSidebarOpen(true)}
          navigationOpen={isSidebarOpen} menuButtonRef={menuButtonRef} />
        <div id="admin-workspace-content" tabIndex={-1}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
