import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";
import ActivateAccount from "./pages/ActivateAccount.jsx";
import Notifications from "./pages/Notifications.jsx";

import AdminDashboard from "./pages/admin/Dashboard.jsx";
import Buildings from "./pages/admin/Buildings.jsx";
import Rooms from "./pages/admin/Rooms.jsx";
import Tenants from "./pages/admin/Tenants.jsx";
import Communications from "./pages/admin/Communications.jsx";
import StaffAccounts from "./pages/admin/StaffAccounts.jsx";

import TenantDashboard from "./pages/tenant/Dashboard.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/activate-account"
          element={<ActivateAccount />}
        />

        <Route
          path="/unauthorized"
          element={<Unauthorized />}
        />

        {/* Management-protected routes */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={[
                "ADMIN",
                "BUILDING_ADMIN",
                "SUPERVISOR",
              ]}
            />
          }
        >
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/buildings"
            element={<Buildings />}
          />

          <Route
            path="/admin/rooms"
            element={<Rooms />}
          />

          <Route
            path="/admin/tenants"
            element={<Tenants />}
          />

          <Route
            path="/admin/communications"
            element={<Communications />}
          />

          <Route
            path="/admin/notifications"
            element={<Notifications />}
          />
        </Route>
        {/* Super Admin-only routes */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN"]}
            />
          }
        >
          <Route
            path="/admin/staff-accounts"
            element={<StaffAccounts />}
          />
        </Route>
        {/* Tenant-protected routes */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={["TENANT"]}
            />
          }
        >
          <Route
            path="/tenant/dashboard"
            element={<TenantDashboard />}
          />

          <Route
            path="/tenant/notifications"
            element={<Notifications />}
          />
        </Route>

        {/* Unknown routes */}
        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}