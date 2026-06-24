import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";

export default function QRCardPage() {
  const { token } = useParams();
  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  useEffect(() => {
    async function fetchStudent() {
      try {
        const res = await fetch(`/api/qr?token=${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setStudent(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [token]);

  useEffect(() => {
    if (student && canvasRef.current) {
      const url = `${window.location.origin}/qr/${student.qrToken}`;
      QRCode.toCanvas(canvasRef.current, url, {
        width: 260,
        margin: 2,
        color: { dark: "#1a202c", light: "#ffffff" },
      });
    }
  }, [student]);

  if (loading) return <div style={styles.center}>Loading...</div>;
  if (error)
    return <div style={styles.center}>Invalid or expired QR link.</div>;

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <p style={styles.headerLabel}>Engineering Department</p>
          <h1 style={styles.headerTitle}>Attendance QR</h1>
        </div>

        {/* Student Info */}
        <div style={styles.infoSection}>
          <p style={styles.studentName}>
            {student.lastName}, {student.firstName}
          </p>
          <p style={styles.studentDetails}>
            {student.course} — Year {student.yearLevel}
          </p>
          <p style={styles.studentId}>ID: {student.studentId}</p>
        </div>

        {/* QR Code */}
        <div style={styles.qrWrapper}>
          <canvas ref={canvasRef} style={styles.qrCanvas} />
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Show this QR code to the officer during attendance check.
          </p>
          <p style={styles.footerHint}>Do not share this link with others.</p>
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
    maxWidth: "360px",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#2c5282",
    padding: "1.25rem 1.5rem",
    textAlign: "center",
  },
  headerLabel: {
    color: "#bee3f8",
    fontSize: "0.8rem",
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
  infoSection: {
    padding: "1.25rem 1.5rem",
    textAlign: "center",
    borderBottom: "1px solid #e2e8f0",
  },
  studentName: {
    fontSize: "1.2rem",
    fontWeight: "700",
    color: "#1a202c",
    margin: 0,
  },
  studentDetails: {
    fontSize: "0.9rem",
    color: "#4a5568",
    margin: "0.25rem 0 0",
  },
  studentId: {
    fontSize: "0.85rem",
    color: "#718096",
    margin: "0.25rem 0 0",
  },
  qrWrapper: {
    display: "flex",
    justifyContent: "center",
    padding: "1.5rem",
  },
  qrCanvas: {
    borderRadius: "8px",
  },
  footer: {
    backgroundColor: "#f7fafc",
    padding: "1rem 1.5rem",
    textAlign: "center",
    borderTop: "1px solid #e2e8f0",
  },
  footerText: {
    fontSize: "0.85rem",
    color: "#4a5568",
    margin: 0,
  },
  footerHint: {
    fontSize: "0.75rem",
    color: "#a0aec0",
    margin: "0.25rem 0 0",
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    fontSize: "1rem",
    color: "#718096",
  },
};
