import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function EventsPage() {
  const { token, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  async function handleDelete(id) {
    if (
      !confirm(
        "Delete this event? All attendance records for it will also be deleted.",
      )
    )
      return;
    await fetch(`/api/events?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchEvents();
  }

  return (
    <div>
      <div style={styles.topBar}>
        <h1 style={styles.heading}>Events</h1>
        <button
          style={styles.addBtn}
          onClick={() => {
            setEditEvent(null);
            setShowModal(true);
          }}
        >
          + New Event
        </button>
      </div>

      {loading ? (
        <p style={styles.empty}>Loading...</p>
      ) : error ? (
        <p style={styles.empty}>Error: {error}</p>
      ) : events.length === 0 ? (
        <p style={styles.empty}>No events yet. Create one to get started.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Event Name</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Created By</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e._id}>
                <td style={styles.td}>{e.name}</td>
                <td style={styles.td}>
                  {new Date(e.date).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td style={styles.td}>{e.description || "—"}</td>
                <td style={styles.td}>{e.createdByName}</td>
                <td style={styles.td}>
                  <button
                    style={styles.btnEdit}
                    onClick={() => {
                      setEditEvent(e);
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </button>
                  {user?.role === "admin" && (
                    <button
                      style={styles.btnDelete}
                      onClick={() => handleDelete(e._id)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <EventModal
          token={token}
          event={editEvent}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
}

function EventModal({ token, event, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: event?.name || "",
    date: event?.date ? new Date(event.date).toISOString().split("T")[0] : "",
    description: event?.description || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const url = event ? `/api/events?id=${event._id}` : "/api/events";
      const method = event ? "PATCH" : "POST";
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
        <h2 style={styles.modalTitle}>{event ? "Edit Event" : "New Event"}</h2>
        {error && <div style={styles.errorBox}>{error}</div>}

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Event Name</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. General Assembly"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Date</label>
          <input
            style={styles.input}
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Description (optional)</label>
          <textarea
            style={{ ...styles.input, minHeight: "80px", resize: "vertical" }}
            placeholder="Brief description of the event..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
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
  empty: { color: "#718096", fontSize: "0.9rem", marginTop: "1rem" },
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
};
