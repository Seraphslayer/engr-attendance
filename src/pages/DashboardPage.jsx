import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function DashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [token]);

  if (loading) return <div style={styles.center}>Loading dashboard...</div>;
  if (error) return <div style={styles.center}>Error: {error}</div>;

  return (
    <div>
      <h1 style={styles.heading}>Dashboard</h1>

      {/* Stat Cards */}
      <div style={styles.cardRow}>
        <StatCard
          label="Total Students"
          value={data.totalStudents}
          color="#3182ce"
        />
        <StatCard
          label="Total Events"
          value={data.totalEvents}
          color="#38a169"
        />
        <StatCard
          label="Courses"
          value={data.studentsByCourse.length}
          color="#d69e2e"
        />
      </div>

      {/* Students by Course */}
      <div style={styles.section}>
        <h2 style={styles.subheading}>Students by Course</h2>
        <div style={styles.cardRow}>
          {data.studentsByCourse.map((c) => (
            <div key={c._id} style={styles.courseCard}>
              <p style={styles.courseLabel}>{c._id}</p>
              <p style={styles.courseCount}>{c.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Events */}
      <div style={styles.section}>
        <h2 style={styles.subheading}>Recent Events</h2>
        {data.recentEvents.length === 0 ? (
          <p style={styles.empty}>No events yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Event</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {data.recentEvents.map((e) => (
                <tr key={e._id}>
                  <td style={styles.td}>{e.name}</td>
                  <td style={styles.td}>
                    {new Date(e.date).toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td style={styles.td}>{e.attendanceCount} present</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `4px solid ${color}` }}>
      <p style={styles.statValue}>{value}</p>
      <p style={styles.statLabel}>{label}</p>
    </div>
  );
}

const styles = {
  heading: {
    fontSize: "1.75rem",
    fontWeight: "700",
    marginBottom: "1.5rem",
    color: "#1a202c",
  },
  subheading: {
    fontSize: "1.1rem",
    fontWeight: "600",
    marginBottom: "1rem",
    color: "#2d3748",
  },
  cardRow: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    marginBottom: "1rem",
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: "10px",
    padding: "1.25rem 1.5rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    minWidth: "160px",
    flex: 1,
  },
  statValue: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1a202c",
    margin: 0,
  },
  statLabel: {
    fontSize: "0.85rem",
    color: "#718096",
    margin: "0.25rem 0 0",
  },
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: "10px",
    padding: "1rem 1.5rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    minWidth: "120px",
    flex: 1,
    textAlign: "center",
  },
  courseLabel: {
    fontSize: "0.85rem",
    color: "#718096",
    margin: 0,
    fontWeight: "600",
  },
  courseCount: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#2b6cb0",
    margin: "0.25rem 0 0",
  },
  section: {
    marginTop: "2rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#fff",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  },
  th: {
    textAlign: "left",
    padding: "0.75rem 1rem",
    backgroundColor: "#ebf8ff",
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#2c5282",
    borderBottom: "1px solid #bee3f8",
  },
  td: {
    padding: "0.75rem 1rem",
    fontSize: "0.9rem",
    color: "#2d3748",
    borderBottom: "1px solid #e2e8f0",
  },
  empty: {
    color: "#718096",
    fontSize: "0.9rem",
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "50vh",
    fontSize: "1rem",
    color: "#718096",
  },
};
