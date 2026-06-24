import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function ReportsPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [records, setRecords] = useState([]);
  const [eventInfo, setEventInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) fetchAttendance();
  }, [selectedEvent]);

  async function fetchEvents() {
    const res = await fetch("/api/events", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setEvents(data);
    if (data.length > 0) setSelectedEvent(data[0]._id);
  }

  async function fetchAttendance() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/attendance?eventId=${selectedEvent}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecords(data);
      const found = events.find((e) => e._id === selectedEvent);
      setEventInfo(found || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Attendance Report", 14, 16);
    doc.setFontSize(11);
    doc.text(`Event: ${eventInfo?.name || ""}`, 14, 24);
    doc.text(
      `Date: ${new Date(eventInfo?.date).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      14,
      30,
    );
    doc.text(`Total Present: ${records.length}`, 14, 36);

    autoTable(doc, {
      startY: 42,
      head: [["#", "Student ID", "Name", "Course", "Year", "Method", "Time"]],
      body: records.map((r, i) => [
        i + 1,
        r.student?.studentId || "—",
        r.student ? `${r.student.lastName}, ${r.student.firstName}` : "Unknown",
        r.student?.course || "—",
        r.student?.yearLevel || "—",
        r.method === "qr" ? "QR" : "Manual",
        new Date(r.timestamp).toLocaleTimeString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [44, 82, 130] },
    });

    doc.save(`attendance_${eventInfo?.name || "report"}.pdf`);
  }

  function exportExcel() {
    const rows = records.map((r, i) => ({
      "#": i + 1,
      "Student ID": r.student?.studentId || "—",
      "Last Name": r.student?.lastName || "Unknown",
      "First Name": r.student?.firstName || "Unknown",
      Course: r.student?.course || "—",
      "Year Level": r.student?.yearLevel || "—",
      Method: r.method === "qr" ? "QR" : "Manual",
      Time: new Date(r.timestamp).toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `attendance_${eventInfo?.name || "report"}.xlsx`);
  }

  // Summary by course
  const courseSummary = records.reduce((acc, r) => {
    const course = r.student?.course || "Unknown";
    acc[course] = (acc[course] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 style={styles.heading}>Reports</h1>

      {/* Event Selector */}
      <div style={styles.eventRow}>
        <label style={styles.label}>Select Event:</label>
        <select
          style={styles.select}
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
        >
          {events.map((e) => (
            <option key={e._id} value={e._id}>
              {e.name} —{" "}
              {new Date(e.date).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </option>
          ))}
        </select>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <p style={styles.empty}>Loading...</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={styles.cardRow}>
            <div style={styles.statCard}>
              <p style={styles.statValue}>{records.length}</p>
              <p style={styles.statLabel}>Total Present</p>
            </div>
            {Object.entries(courseSummary).map(([course, count]) => (
              <div key={course} style={styles.statCard}>
                <p style={styles.statValue}>{count}</p>
                <p style={styles.statLabel}>{course}</p>
              </div>
            ))}
          </div>

          {/* Export Buttons */}
          {records.length > 0 && (
            <div style={styles.exportRow}>
              <button style={styles.pdfBtn} onClick={exportPDF}>
                Export PDF
              </button>
              <button style={styles.xlsxBtn} onClick={exportExcel}>
                Export Excel
              </button>
            </div>
          )}

          {/* Table */}
          {records.length === 0 ? (
            <p style={styles.empty}>No attendance records for this event.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Student ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Course</th>
                  <th style={styles.th}>Year</th>
                  <th style={styles.th}>Method</th>
                  <th style={styles.th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r._id}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={styles.td}>{r.student?.studentId || "—"}</td>
                    <td style={styles.td}>
                      {r.student
                        ? `${r.student.lastName}, ${r.student.firstName}`
                        : "Unknown"}
                    </td>
                    <td style={styles.td}>{r.student?.course || "—"}</td>
                    <td style={styles.td}>{r.student?.yearLevel || "—"}</td>
                    <td style={styles.td}>
                      <span
                        style={
                          r.method === "qr"
                            ? styles.badgeQr
                            : styles.badgeManual
                        }
                      >
                        {r.method === "qr" ? "QR" : "Manual"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {new Date(r.timestamp).toLocaleTimeString("en-PH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  heading: {
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: "1.5rem",
  },
  eventRow: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.25rem",
  },
  label: { fontSize: "0.9rem", fontWeight: "600", color: "#4a5568" },
  select: {
    padding: "0.6rem 1rem",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.95rem",
  },
  cardRow: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    marginBottom: "1.5rem",
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: "10px",
    padding: "1.25rem 1.5rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    minWidth: "120px",
    flex: 1,
    borderTop: "4px solid #3182ce",
  },
  statValue: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1a202c",
    margin: 0,
  },
  statLabel: { fontSize: "0.85rem", color: "#718096", margin: "0.25rem 0 0" },
  exportRow: { display: "flex", gap: "0.75rem", marginBottom: "1.25rem" },
  pdfBtn: {
    padding: "0.6rem 1.25rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#e53e3e",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },
  xlsxBtn: {
    padding: "0.6rem 1.25rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#38a169",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
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
  empty: { color: "#718096", fontSize: "0.9rem" },
  errorBox: {
    backgroundColor: "#fff5f5",
    color: "#c53030",
    padding: "0.75rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    border: "1px solid #fed7d7",
    marginBottom: "1rem",
  },
  badgeQr: {
    padding: "0.2rem 0.6rem",
    borderRadius: "999px",
    backgroundColor: "#e9d8fd",
    color: "#553c9a",
    fontSize: "0.78rem",
    fontWeight: "600",
  },
  badgeManual: {
    padding: "0.2rem 0.6rem",
    borderRadius: "999px",
    backgroundColor: "#c6f6d5",
    color: "#276749",
    fontSize: "0.78rem",
    fontWeight: "600",
  },
};
