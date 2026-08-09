import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";

export default function CheckinPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [mode, setMode] = useState("search"); // "search" or "id"
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentIdInput, setStudentIdInput] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchEvent();
  }, []);

  async function fetchEvent() {
    try {
      const res = await fetch(`/api/events?id=${eventId}`);
      // events endpoint requires auth normally, but this is a fallback —
      // we try public fetch first via a lightweight approach
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
      }
    } catch {}
  }

  function handleSearchChange(value) {
    setSearch(value);
    setSelectedStudent(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/students?action=lookup&search=${encodeURIComponent(value)}`,
        );
        const data = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      }
    }, 300);
  }

  async function handleCheckinBySelection() {
    if (!selectedStudent) return;
    await submitCheckin({ studentId: selectedStudent._id });
  }

  async function handleCheckinById() {
    if (!studentIdInput.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/students?action=lookup&search=${encodeURIComponent(studentIdInput.trim())}`,
      );
      const data = await res.json();
      const exact = data.find(
        (s) =>
          s.studentId.toLowerCase() === studentIdInput.trim().toLowerCase(),
      );
      if (!exact) {
        setMessage({ type: "error", text: "❌ Student ID not found." });
        setSubmitting(false);
        return;
      }
      await submitCheckin({ studentId: exact._id });
    } catch {
      setMessage({ type: "error", text: "❌ Network error." });
      setSubmitting(false);
    }
  }

  async function submitCheckin({ studentId }) {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/attendance?checkin=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, studentId, method: "self-checkin" }),
      });
      const data = await res.json();

      if (res.status === 409) {
        setMessage({
          type: "warning",
          text: `⚠️ ${data.student?.name} already marked present.`,
        });
      } else if (!res.ok) {
        setMessage({ type: "error", text: `❌ ${data.error}` });
      } else {
        setMessage({
          type: "success",
          text: `✅ ${data.student?.name} — attendance recorded!`,
        });
        setSearch("");
        setResults([]);
        setSelectedStudent(null);
        setStudentIdInput("");
      }
    } catch {
      setMessage({ type: "error", text: "❌ Network error. Try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const msgColors = {
    success: { bg: "#f0fff4", color: "#276749", border: "#c6f6d5" },
    warning: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
    error: { bg: "#fff5f5", color: "#c53030", border: "#fed7d7" },
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <p style={styles.headerLabel}>Engineering Department</p>
          <h1 style={styles.headerTitle}>Attendance Check-in</h1>
          {event && (
            <p style={styles.eventName}>
              {event.name} —{" "}
              {new Date(event.date).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        <div style={styles.body}>
          {/* Mode toggle */}
          <div style={styles.toggleRow}>
            <button
              style={{
                ...styles.toggleBtn,
                ...(mode === "search" ? styles.toggleActive : {}),
              }}
              onClick={() => setMode("search")}
            >
              Search Name
            </button>
            <button
              style={{
                ...styles.toggleBtn,
                ...(mode === "id" ? styles.toggleActive : {}),
              }}
              onClick={() => setMode("id")}
            >
              Enter Student ID
            </button>
          </div>

          {message && (
            <div
              style={{
                ...styles.messageBox,
                backgroundColor: msgColors[message.type].bg,
                color: msgColors[message.type].color,
                border: `1px solid ${msgColors[message.type].border}`,
              }}
            >
              {message.text}
            </div>
          )}

          {mode === "search" ? (
            <>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Search your name</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Type your first or last name..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>

              {results.length > 0 && !selectedStudent && (
                <div style={styles.resultsList}>
                  {results.map((s) => (
                    <div
                      key={s._id}
                      style={styles.resultItem}
                      onClick={() => {
                        setSelectedStudent(s);
                        setSearch(`${s.lastName}, ${s.firstName}`);
                        setResults([]);
                      }}
                    >
                      <p style={styles.resultName}>
                        {s.lastName}, {s.firstName}
                      </p>
                      <p style={styles.resultDetails}>
                        {s.studentId} — {s.course} Y{s.yearLevel}{" "}
                        {s.section ? `— ${s.section}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {selectedStudent && (
                <div style={styles.selectedBox}>
                  <p style={styles.selectedName}>
                    {selectedStudent.lastName}, {selectedStudent.firstName}
                  </p>
                  <p style={styles.selectedDetails}>
                    {selectedStudent.studentId} — {selectedStudent.course} Y
                    {selectedStudent.yearLevel}{" "}
                    {selectedStudent.section
                      ? `— ${selectedStudent.section}`
                      : ""}
                  </p>
                </div>
              )}

              <button
                style={{
                  ...styles.submitBtn,
                  opacity: !selectedStudent || submitting ? 0.6 : 1,
                }}
                onClick={handleCheckinBySelection}
                disabled={!selectedStudent || submitting}
              >
                {submitting ? "Marking..." : "Mark Present"}
              </button>
            </>
          ) : (
            <>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Student ID</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="e.g. 2021-00123"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCheckinById()}
                />
              </div>
              <button
                style={{
                  ...styles.submitBtn,
                  opacity: !studentIdInput.trim() || submitting ? 0.6 : 1,
                }}
                onClick={handleCheckinById}
                disabled={!studentIdInput.trim() || submitting}
              >
                {submitting ? "Marking..." : "Mark Present"}
              </button>
            </>
          )}
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>Only mark your own attendance.</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    backgroundColor: "#f0f4f8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
    width: "100%",
    maxWidth: "440px",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#2c5282",
    padding: "1.25rem 1.5rem",
    textAlign: "center",
  },
  headerLabel: {
    color: "#bee3f8",
    fontSize: "0.78rem",
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  headerTitle: {
    color: "#fff",
    fontSize: "1.4rem",
    fontWeight: "700",
    margin: "0.25rem 0 0",
  },
  eventName: { color: "#bee3f8", fontSize: "0.85rem", margin: "0.4rem 0 0" },
  body: {
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  toggleRow: {
    display: "flex",
    gap: "0.5rem",
    backgroundColor: "#f7fafc",
    padding: "0.3rem",
    borderRadius: "10px",
  },
  toggleBtn: {
    flex: 1,
    padding: "0.55rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "transparent",
    color: "#4a5568",
    fontWeight: "600",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  toggleActive: { backgroundColor: "#2c5282", color: "#fff" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  label: { fontSize: "0.85rem", fontWeight: "600", color: "#4a5568" },
  input: {
    padding: "0.7rem 0.9rem",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.95rem",
    width: "100%",
    boxSizing: "border-box",
  },
  resultsList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    maxHeight: "220px",
    overflowY: "auto",
  },
  resultItem: {
    padding: "0.6rem 0.85rem",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
  },
  resultName: {
    fontWeight: "600",
    fontSize: "0.9rem",
    color: "#1a202c",
    margin: 0,
  },
  resultDetails: {
    fontSize: "0.78rem",
    color: "#718096",
    margin: "0.15rem 0 0",
  },
  selectedBox: {
    padding: "0.85rem",
    borderRadius: "8px",
    backgroundColor: "#ebf8ff",
    border: "1px solid #bee3f8",
  },
  selectedName: {
    fontWeight: "700",
    fontSize: "1rem",
    color: "#1a202c",
    margin: 0,
  },
  selectedDetails: {
    fontSize: "0.82rem",
    color: "#4a5568",
    margin: "0.2rem 0 0",
  },
  submitBtn: {
    padding: "0.75rem",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#38a169",
    color: "#fff",
    fontWeight: "700",
    fontSize: "1rem",
    cursor: "pointer",
  },
  messageBox: {
    padding: "0.85rem 1rem",
    borderRadius: "10px",
    fontSize: "0.9rem",
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    backgroundColor: "#f7fafc",
    padding: "0.85rem 1.5rem",
    textAlign: "center",
    borderTop: "1px solid #e2e8f0",
  },
  footerText: { fontSize: "0.78rem", color: "#a0aec0", margin: 0 },
};
