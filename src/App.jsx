import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import QRCardPage from "./pages/QRCardPage";

// Placeholder pages — we'll fill these in next
import DashboardPage from "./pages/DashboardPage";
import StudentsPage from "./pages/StudentsPage";
import EventsPage from "./pages/EventsPage";
import AttendancePage from "./pages/AttendancePage";
import ReportsPage from "./pages/ReportsPage";

import { useState } from "react";

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f7fafc" }}>
      {/* Top navbar for mobile */}
      <div style={topbarStyles.bar}>
        <button
          style={topbarStyles.menuBtn}
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
        <span style={topbarStyles.title}>ENGR Attendance</span>
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main style={topbarStyles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const topbarStyles = {
  bar: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    backgroundColor: "#2c5282",
    padding: "0.75rem 1rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  menuBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "1.5rem",
    cursor: "pointer",
    lineHeight: 1,
  },
  title: {
    color: "#fff",
    fontWeight: "700",
    fontSize: "1rem",
  },
  main: {
    padding: "1.5rem 1rem",
  },
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/qr/:token" element={<QRCardPage />} />

          {/* Protected routes with sidebar layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/students"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <StudentsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route
              path="/reports"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
