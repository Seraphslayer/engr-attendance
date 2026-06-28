import { useState } from "react";
import { generateSections, parseSectionLabel } from "../utils/sections";

const courses = ["CoE", "IE", "EE"];
const sections = generateSections();

export default function RegisterPage() {
  const [form, setForm] = useState({
    studentId: "",
    firstName: "",
    lastName: "",
    course: "CoE",
    yearLevel: 1,
    section: sections[0],
    email: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError("");
    if (
      !form.studentId ||
      !form.firstName ||
      !form.lastName ||
      !form.course ||
      !form.yearLevel ||
      !form.section
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed.");
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <div style={styles.header}>
            <p style={styles.headerLabel}>Engineering Department</p>
            <h1 style={styles.headerTitle}>Student Registration</h1>
          </div>
          <div style={styles.successBody}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Registered!</h2>
            <p style={styles.successText}>
              You have been successfully registered in the Engineering
              Attendance System.
            </p>
            <p style={styles.successHint}>
              Your QR code will be available from your officer or admin.
            </p>
            <button
              style={styles.btn}
              onClick={() => {
                setSuccess(false);
                setForm({
                  studentId: "",
                  firstName: "",
                  lastName: "",
                  course: "CoE",
                  yearLevel: 1,
                  section: sections[0],
                  email: "",
                });
              }}
            >
              Register Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <p style={styles.headerLabel}>Engineering Department</p>
          <h1 style={styles.headerTitle}>Student Registration</h1>
        </div>

        <div style={styles.form}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Student ID <span style={styles.required}>*</span>
            </label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. 2021-00123"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                First Name <span style={styles.required}>*</span>
              </label>
              <input
                style={styles.input}
                type="text"
                placeholder="Juan"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Last Name <span style={styles.required}>*</span>
              </label>
              <input
                style={styles.input}
                type="text"
                placeholder="dela Cruz"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Email <span style={styles.optional}>(optional)</span>
            </label>
            <input
              style={styles.input}
              type="email"
              placeholder="juan@school.edu.ph"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Course <span style={styles.required}>*</span>
              </label>
              <select
                style={styles.input}
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
              >
                {courses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                Year Level <span style={styles.required}>*</span>
              </label>
              <select
                style={styles.input}
                value={form.yearLevel}
                onChange={(e) =>
                  setForm({ ...form, yearLevel: parseInt(e.target.value) })
                }
              >
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Section <span style={styles.required}>*</span>
            </label>
            <select
              style={styles.input}
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
            >
              {sections.map((s) => (
                <option key={s} value={s}>
                  {parseSectionLabel(s)}
                </option>
              ))}
            </select>
            <p style={styles.sectionHint}>
              Format: [Year][Sem][M/A][Section#] — e.g. 11M1 = Year 1, Sem 1,
              Morning, Section 1
            </p>
          </div>

          <button
            style={{ ...styles.btn, opacity: saving ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Registering..." : "Register"}
          </button>

          <p style={styles.note}>
            * Required fields. Contact your officer if you have trouble
            registering.
          </p>
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
    maxWidth: "480px",
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
  form: {
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  successBody: {
    padding: "2rem 1.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "0.75rem",
  },
  successIcon: { fontSize: "3rem" },
  successTitle: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#276749",
    margin: 0,
  },
  successText: { fontSize: "0.95rem", color: "#4a5568", margin: 0 },
  successHint: { fontSize: "0.85rem", color: "#a0aec0", margin: 0 },
  row: { display: "flex", gap: "0.75rem" },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
    flex: 1,
  },
  label: { fontSize: "0.85rem", fontWeight: "600", color: "#4a5568" },
  required: { color: "#e53e3e", marginLeft: "2px" },
  optional: { color: "#a0aec0", fontWeight: "400", fontSize: "0.8rem" },
  input: {
    padding: "0.65rem 0.9rem",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.95rem",
    width: "100%",
    boxSizing: "border-box",
  },
  sectionHint: {
    fontSize: "0.75rem",
    color: "#a0aec0",
    margin: "0.25rem 0 0",
  },
  btn: {
    padding: "0.75rem",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#2c5282",
    color: "#fff",
    fontWeight: "700",
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: "0.5rem",
    width: "100%",
  },
  errorBox: {
    backgroundColor: "#fff5f5",
    color: "#c53030",
    padding: "0.75rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    border: "1px solid #fed7d7",
  },
  note: {
    fontSize: "0.78rem",
    color: "#a0aec0",
    textAlign: "center",
    margin: 0,
  },
};
