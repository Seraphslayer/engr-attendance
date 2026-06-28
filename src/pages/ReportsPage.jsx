import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const COURSES = ["All Courses", "CoE", "IE", "EE"];

export default function ReportsPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [records, setRecords] = useState([]);
  const [eventInfo, setEventInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [courseFilter, setCourseFilter] = useState("All Courses");

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

  // Filtered records based on selected course
  const filteredRecords =
    courseFilter === "All Courses"
      ? records
      : records.filter((r) => r.student?.course === courseFilter);

  // Summary by course (always from all records)
  const courseSummary = records.reduce((acc, r) => {
    const course = r.student?.course || "Unknown";
    acc[course] = (acc[course] || 0) + 1;
    return acc;
  }, {});

  const exportLabel = courseFilter === "All Courses" ? "" : `_${courseFilter}`;

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
    doc.text(`Course: ${courseFilter}`, 14, 36);
    doc.text(`Total Present: ${filteredRecords.length}`, 14, 42);

    autoTable(doc, {
      startY: 48,
      head: [["#", "Student ID", "Name", "Course", "Year", "Method", "Time"]],
      body: filteredRecords.map((r, i) => [
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

    doc.save(`attendance_${eventInfo?.name || "report"}${exportLabel}.pdf`);
  }

  function exportExcel() {
    if (courseFilter === "All Courses") {
      // Export all courses each on their own sheet
      const wb = XLSX.utils.book_new();

      ["CoE", "IE", "EE"].forEach((course) => {
        const courseRecords = records.filter(
          (r) => r.student?.course === course,
        );
        if (courseRecords.length === 0) return;
        const rows = courseRecords.map((r, i) => ({
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
        XLSX.utils.book_append_sheet(wb, ws, course);
      });

      // Also add an All sheet
      const allRows = records.map((r, i) => ({
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
      const wsAll = XLSX.utils.json_to_sheet(allRows);
      XLSX.utils.book_append_sheet(wb, wsAll, "All");

      XLSX.writeFile(
        wb,
        `attendance_${eventInfo?.name || "report"}_all_courses.xlsx`,
      );
    } else {
      // Export only the selected course
      const rows = filteredRecords.map((r, i) => ({
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
      XLSX.utils.book_append_sheet(wb, ws, courseFilter);
      XLSX.writeFile(
        wb,
        `attendance_${eventInfo?.name || "report"}_${courseFilter}.xlsx`,
      );
    }
  }

  return (
    <div>
      <h1 style={styles.heading}>Reports</h1>

      {/* Filters Row */}
      <div style={styles.filterRow}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Event:</label>
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

        <div style={styles.filterGroup}>
          <label style={styles.label}>Course:</label>
          <div style={styles.courseButtons}>
            {COURSES.map((c) => (
              <button
                key={c}
                style={{
                  ...styles.courseBtn,
                  backgroundColor: courseFilter === c ? "#2c5282" : "#fff",
                  color: courseFilter === c ? "#fff" : "#2c5282",
                }}
                onClick={() => setCourseFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <p style={styles.empty}>Loading...</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={styles.cardRow}>
            <div style={{ ...styles.statCard, borderTop: "4px solid #3182ce" }}>
              <p style={styles.statValue}>{records.length}</p>
              <p style={styles.statLabel}>Total Present</p>
            </div>
            {Object.entries(courseSummary).map(([course, count]) => (
              <div
                key={course}
                style={{
                  ...styles.statCard,
                  borderTop: `4px solid ${
                    course === "CoE"
                      ? "#805ad5"
                      : course === "IE"
                        ? "#38a169"
                        : "#dd6b20"
                  }`,
                  opacity:
                    courseFilter === "All Courses" || courseFilter === course
                      ? 1
                      : 0.4,
                }}
              >
                <p style={styles.statValue}>{count}</p>
                <p style={styles.statLabel}>{course}</p>
              </div>
            ))}
          </div>

          {/* Filtered count */}
          {courseFilter !== "All Courses" && (
            <p style={styles.filterNote}>
              Showing <strong>{filteredRecords.length}</strong> records for{" "}
              <strong>{courseFilter}</strong>
            </p>
          )}

          {/* Export Buttons */}
          {filteredRecords.length > 0 && (
            <div style={styles.exportRow}>
              <button style={styles.pdfBtn} onClick={exportPDF}>
                Export PDF{" "}
                {courseFilter !== "All Courses" ? `(${courseFilter})` : ""}
              </button>
              <button style={styles.xlsxBtn} onClick={exportExcel}>
                Export Excel{" "}
                {courseFilter === "All Courses"
                  ? "(All — separate sheets)"
                  : `(${courseFilter})`}
              </button>
            </div>
          )}

          {/* Table */}
          {filteredRecords.length === 0 ? (
            <p style={styles.empty}>
              {records.length === 0
                ? "No attendance records for this event."
                : `No ${courseFilter} students present for this event.`}
            </p>
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
                {filteredRecords.map((r, i) => (
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
  filterRow: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    marginBottom: "1.25rem",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    flexWrap: "wrap",
  },
  label: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#4a5568",
    whiteSpace: "nowrap",
  },
  select: {
    padding: "0.6rem 1rem",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.95rem",
  },
  courseButtons: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  courseBtn: {
    padding: "0.45rem 1rem",
    borderRadius: "8px",
    border: "1px solid #2c5282",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.85rem",
    transition: "all 0.15s",
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
    minWidth: "120px",
    flex: 1,
    transition: "opacity 0.2s",
  },
  statValue: {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1a202c",
    margin: 0,
  },
  statLabel: { fontSize: "0.85rem", color: "#718096", margin: "0.25rem 0 0" },
  filterNote: { fontSize: "0.9rem", color: "#4a5568", marginBottom: "1rem" },
  exportRow: {
    display: "flex",
    gap: "0.75rem",
    marginBottom: "1.25rem",
    flexWrap: "wrap",
  },
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
