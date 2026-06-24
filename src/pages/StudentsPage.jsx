import { useEffect, useState, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import * as XLSX from "xlsx";
import QRCode from "qrcode";

export default function StudentsPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const qrCanvasRef = useRef(null);

  const courses = ["CoE", "IE", "EE"];

  async function fetchStudents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (courseFilter) params.append("course", courseFilter);
      const res = await fetch(`/api/students?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudents();
  }, [search, courseFilter]);

  async function handleDelete(id) {
    if (!confirm("Delete this student?")) return;
    await fetch(`/api/students?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchStudents();
  }

  async function handleImportExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      const students = rows.map((r) => ({
        studentId: r["Student ID"]?.toString(),
        firstName: r["First Name"],
        lastName: r["Last Name"],
        course: r["Course"],
        yearLevel: r["Year Level"],
        email: r["Email"] || "",
      }));
      const res = await fetch("/api/students?action=import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ students }),
      });
      const data = await res.json();
      alert(
        `Imported ${data.inserted} students. Skipped ${data.skipped} duplicates.`,
      );
      fetchStudents();
    };
    reader.readAsBinaryString(file);
  }

  async function openQR(student) {
    setQrModal(student);
    setTimeout(async () => {
      if (qrCanvasRef.current) {
        const url = `${window.location.origin}/qr/${student.qrToken}`;
        await QRCode.toCanvas(qrCanvasRef.current, url, { width: 220 });
      }
    }, 100);
  }

  return (
    <div>
      <div style={styles.topBar}>
        <h1 style={styles.heading}>Students</h1>
        <div style={styles.actions}>
          <label style={styles.importBtn}>
            Import Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              style={{ display: "none" }}
            />
          </label>
          <button
            style={styles.addBtn}
            onClick={() => {
              setEditStudent(null);
              setShowModal(true);
            }}
          >
            + Add Student
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filterRow}>
        <input
          style={styles.searchInput}
          placeholder="Search by name or student ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={styles.select}
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p style={styles.empty}>Loading...</p>
      ) : error ? (
        <p style={styles.empty}>Error: {error}</p>
      ) : students.length === 0 ? (
        <p style={styles.empty}>No students found.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Student ID</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Course</th>
              <th style={styles.th}>Year</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s._id}>
                <td style={styles.td}>{s.studentId}</td>
                <td style={styles.td}>
                  {s.lastName}, {s.firstName}
                </td>
                <td style={styles.td}>{s.course}</td>
                <td style={styles.td}>{s.yearLevel}</td>
                <td style={styles.td}>{s.email || "—"}</td>
                <td style={styles.td}>
                  <button style={styles.btnQr} onClick={() => openQR(s)}>
                    QR
                  </button>
                  <button
                    style={styles.btnEdit}
                    onClick={() => {
                      setEditStudent(s);
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    style={styles.btnDelete}
                    onClick={() => handleDelete(s._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <StudentModal
          token={token}
          student={editStudent}
          courses={courses}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchStudents();
          }}
        />
      )}

      {/* QR Modal */}
      {qrModal && (
        <div style={styles.overlay} onClick={() => setQrModal(null)}>
          <div style={styles.qrBox} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.qrName}>
              {qrModal.firstName} {qrModal.lastName}
            </h2>
            <p style={styles.qrSub}>
              {qrModal.course} — Year {qrModal.yearLevel}
            </p>
            <p style={styles.qrSub}>ID: {qrModal.studentId}</p>
            <canvas ref={qrCanvasRef} style={{ margin: "1rem 0" }} />
            <p style={{ fontSize: "0.75rem", color: "#718096" }}>
              Student opens this QR on their phone to show to officers.
            </p>
            <button style={styles.addBtn} onClick={() => setQrModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentModal({ token, student, courses, onClose, onSaved }) {
  const [form, setForm] = useState({
    studentId: student?.studentId || "",
    firstName: student?.firstName || "",
    lastName: student?.lastName || "",
    course: student?.course || "CoE",
    yearLevel: student?.yearLevel || 1,
    email: student?.email || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const url = student ? `/api/students?id=${student._id}` : "/api/students";
      const method = student ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.modalTitle}>
          {student ? "Edit Student" : "Add Student"}
        </h2>
        {error && <div style={styles.errorBox}>{error}</div>}
        {[
          {
            label: "Student ID",
            key: "studentId",
            type: "text",
            disabled: !!student,
          },
          { label: "First Name", key: "firstName", type: "text" },
          { label: "Last Name", key: "lastName", type: "text" },
          { label: "Email", key: "email", type: "email" },
        ].map(({ label, key, type, disabled }) => (
          <div key={key} style={styles.fieldGroup}>
            <label style={styles.label}>{label}</label>
            <input
              style={{
                ...styles.input,
                backgroundColor: disabled ? "#f7fafc" : "#fff",
              }}
              type={type}
              value={form[key]}
              disabled={disabled}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        ))}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Course</label>
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
          <label style={styles.label}>Year Level</label>
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
        <div style={styles.modalActions}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button style={styles.addBtn} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  heading: { fontSize: "1.75rem", fontWeight: "700", color: "#1a202c" },
  actions: { display: "flex", gap: "0.75rem" },
  filterRow: { display: "flex", gap: "1rem", marginBottom: "1.25rem" },
  searchInput: {
    flex: 1,
    padding: "0.6rem 1rem",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.95rem",
  },
  select: {
    padding: "0.6rem 1rem",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.95rem",
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
  empty: { color: "#718096", fontSize: "0.9rem", marginTop: "1rem" },
  addBtn: {
    padding: "0.6rem 1.25rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#3182ce",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  importBtn: {
    padding: "0.6rem 1.25rem",
    borderRadius: "8px",
    border: "1px solid #3182ce",
    color: "#3182ce",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  btnQr: {
    padding: "0.3rem 0.6rem",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#805ad5",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.8rem",
    marginRight: "0.4rem",
  },
  btnEdit: {
    padding: "0.3rem 0.6rem",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#3182ce",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.8rem",
    marginRight: "0.4rem",
  },
  btnDelete: {
    padding: "0.3rem 0.6rem",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#e53e3e",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "2rem",
    width: "100%",
    maxWidth: "440px",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  modalTitle: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: "0.5rem",
  },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "0.25rem" },
  label: { fontSize: "0.85rem", fontWeight: "600", color: "#4a5568" },
  input: {
    padding: "0.6rem 0.9rem",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.95rem",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    marginTop: "0.5rem",
  },
  cancelBtn: {
    padding: "0.6rem 1.25rem",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#fff",
    color: "#4a5568",
    fontWeight: "600",
    cursor: "pointer",
  },
  errorBox: {
    backgroundColor: "#fff5f5",
    color: "#c53030",
    padding: "0.75rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    border: "1px solid #fed7d7",
  },
  qrBox: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "2rem",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  qrName: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#1a202c",
    margin: 0,
  },
  qrSub: { fontSize: "0.875rem", color: "#718096", margin: "0.25rem 0 0" },
};
