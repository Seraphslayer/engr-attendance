import { useEffect, useState, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import { Html5Qrcode } from "html5-qrcode";

export default function AttendancePage() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [manualStudent, setManualStudent] = useState("");
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    fetchEvents();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedEvent) fetchAttendance();
  }, [selectedEvent]);

  useEffect(() => {
    if (showScanner) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [showScanner]);

  async function fetchEvents() {
    const res = await fetch("/api/events", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setEvents(data);
    if (data.length > 0) setSelectedEvent(data[0]._id);
  }

  async function fetchStudents() {
    const res = await fetch("/api/students", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setStudents(data);
  }

  async function fetchAttendance() {
    setLoadingRecords(true);
    try {
      const res = await fetch(`/api/attendance?eventId=${selectedEvent}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecords(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRecords(false);
    }
  }

  async function markAttendance(payload) {
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventId: selectedEvent, ...payload }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setMessage(`⚠️ ${data.student?.name} is already marked present.`);
        return;
      }
      if (!res.ok) throw new Error(data.error);
      setMessage(
        `✅ ${data.student?.name} (${data.student?.course}) marked present!`,
      );
      fetchAttendance();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleManualMark() {
    if (!manualStudent) return;
    await markAttendance({ studentId: manualStudent, method: "manual" });
    setManualStudent("");
  }

  async function handleDelete(id) {
    if (!confirm("Remove this attendance record?")) return;
    await fetch(`/api/attendance?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchAttendance();
  }

  async function startScanner() {
    if (!scannerRef.current) return;
    try {
      html5QrRef.current = new Html5Qrcode("qr-reader");
      await html5QrRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Extract token from URL
          const parts = decodedText.split("/qr/");
          const qrToken = parts[parts.length - 1];
          await markAttendance({ qrToken, method: "qr" });
        },
        () => {},
      );
    } catch (err) {
      setError("Camera error: " + err.message);
      setShowScanner(false);
    }
  }

  async function stopScanner() {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch {}
      html5QrRef.current = null;
    }
  }

  const markedIds = new Set(records.map((r) => r.studentId));
  const unmarkedStudents = students.filter((s) => !markedIds.has(s._id));

  return (
    <div>
      <h1 style={styles.heading}>Attendance</h1>

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

      {/* Feedback */}
      {message && <div style={styles.successBox}>{message}</div>}
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Mark Attendance Controls */}
      {selectedEvent && (
        <div style={styles.controlRow}>
          {/* Manual */}
          <div style={styles.manualBox}>
            <p style={styles.controlLabel}>Manual Mark</p>
            <div style={styles.manualRow}>
              <select
                style={styles.select}
                value={manualStudent}
                onChange={(e) => setManualStudent(e.target.value)}
              >
                <option value="">Select student...</option>
                {unmarkedStudents.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.lastName}, {s.firstName} ({s.course})
                  </option>
                ))}
              </select>
              <button style={styles.markBtn} onClick={handleManualMark}>
                Mark Present
              </button>
            </div>
          </div>

          {/* QR Scanner */}
          <div style={styles.qrBox}>
            <p style={styles.controlLabel}>QR Scanner</p>
            <button
              style={showScanner ? styles.stopBtn : styles.scanBtn}
              onClick={() => setShowScanner(!showScanner)}
            >
              {showScanner ? "Stop Scanner" : "Open Scanner"}
            </button>
          </div>
        </div>
      )}

      {/* QR Reader */}
      {showScanner && (
        <div style={styles.scannerWrapper}>
          <div id="qr-reader" ref={scannerRef} style={styles.scannerBox} />
          <p style={styles.scannerHint}>Point camera at student's QR code</p>
        </div>
      )}

      {/* Attendance Records */}
      <div style={styles.section}>
        <h2 style={styles.subheading}>Present ({records.length})</h2>
        {loadingRecords ? (
          <p style={styles.empty}>Loading...</p>
        ) : records.length === 0 ? (
          <p style={styles.empty}>No attendance records yet for this event.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Student ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Course</th>
                <th style={styles.th}>Year</th>
                <th style={styles.th}>Method</th>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
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
                        r.method === "qr" ? styles.badgeQr : styles.badgeManual
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
                  <td style={styles.td}>
                    <button
                      style={styles.btnDelete}
                      onClick={() => handleDelete(r._id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
  controlRow: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    marginBottom: "1.25rem",
  },
  manualBox: {
    flex: 2,
    backgroundColor: "#fff",
    padding: "1rem 1.25rem",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  },
  qrBox: {
    flex: 1,
    backgroundColor: "#fff",
    padding: "1rem 1.25rem",
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  },
  controlLabel: {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: "0.5rem",
  },
  manualRow: { display: "flex", gap: "0.75rem", alignItems: "center" },
  markBtn: {
    padding: "0.6rem 1.25rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#38a169",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  scanBtn: {
    padding: "0.6rem 1.25rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#805ad5",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },
  stopBtn: {
    padding: "0.6rem 1.25rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#e53e3e",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },
  scannerWrapper: {
    backgroundColor: "#fff",
    borderRadius: "10px",
    padding: "1.25rem",
    marginBottom: "1.25rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  scannerBox: { width: "100%", maxWidth: "400px" },
  scannerHint: { fontSize: "0.85rem", color: "#718096", marginTop: "0.75rem" },
  section: { marginTop: "1.5rem" },
  subheading: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: "1rem",
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
  btnDelete: {
    padding: "0.3rem 0.6rem",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#e53e3e",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.8rem",
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
  successBox: {
    backgroundColor: "#f0fff4",
    color: "#276749",
    padding: "0.75rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    border: "1px solid #c6f6d5",
    marginBottom: "1rem",
  },
  errorBox: {
    backgroundColor: "#fff5f5",
    color: "#c53030",
    padding: "0.75rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    border: "1px solid #fed7d7",
    marginBottom: "1rem",
  },
};
