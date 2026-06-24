import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const navItems = [
  { label: "Dashboard", path: "/dashboard", roles: ["admin", "officer"] },
  { label: "Students", path: "/students", roles: ["admin"] },
  { label: "Events", path: "/events", roles: ["admin", "officer"] },
  { label: "Attendance", path: "/attendance", roles: ["admin", "officer"] },
  { label: "Reports", path: "/reports", roles: ["admin"] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const filtered = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <h2 style={styles.title}>ENGR</h2>
        <p style={styles.subtitle}>Attendance System</p>
      </div>

      <nav style={styles.nav}>
        {filtered.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.navItem,
              backgroundColor: isActive ? "#2b6cb0" : "transparent",
              color: isActive ? "#fff" : "#bee3f8",
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={styles.footer}>
        <p style={styles.userInfo}>{user?.name}</p>
        <p style={styles.userRole}>{user?.role?.toUpperCase()}</p>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: "220px",
    minHeight: "100vh",
    backgroundColor: "#2c5282",
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem 1rem",
    boxSizing: "border-box",
    flexShrink: 0,
  },
  header: {
    marginBottom: "2rem",
    textAlign: "center",
  },
  title: {
    color: "#fff",
    fontSize: "1.5rem",
    fontWeight: "700",
    margin: 0,
  },
  subtitle: {
    color: "#bee3f8",
    fontSize: "0.75rem",
    margin: "0.25rem 0 0",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    flex: 1,
  },
  navItem: {
    padding: "0.65rem 1rem",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "0.95rem",
    fontWeight: "500",
    transition: "background 0.2s",
  },
  footer: {
    borderTop: "1px solid #4a7abd",
    paddingTop: "1rem",
    textAlign: "center",
  },
  userInfo: {
    color: "#fff",
    fontWeight: "600",
    margin: "0 0 0.25rem",
    fontSize: "0.9rem",
  },
  userRole: {
    color: "#bee3f8",
    fontSize: "0.75rem",
    margin: "0 0 0.75rem",
  },
  logoutBtn: {
    width: "100%",
    padding: "0.5rem",
    borderRadius: "8px",
    border: "1px solid #bee3f8",
    backgroundColor: "transparent",
    color: "#bee3f8",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
};
