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

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a bigger canvas with student info printed on it
    const padding = 24;
    const infoHeight = 100;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width + padding * 2;
    exportCanvas.height = canvas.height + infoHeight + padding * 2;

    const ctx = exportCanvas.getContext("2d");

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Header bar
    ctx.fillStyle = "#2c5282";
    ctx.fillRect(0, 0, exportCanvas.width, 60);

    // Header text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("ENGR Attendance", exportCanvas.width / 2, 28);
    ctx.font = "12px Arial";
    ctx.fillStyle = "#bee3f8";
    ctx.fillText("Engineering Department", exportCanvas.width / 2, 48);

    // Student info
    ctx.fillStyle = "#1a202c";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `${student.lastName}, ${student.firstName}`,
      exportCanvas.width / 2,
      82,
    );
    ctx.font = "13px Arial";
    ctx.fillStyle = "#4a5568";
    ctx.fillText(
      `${student.course} — Year ${student.yearLevel}`,
      exportCanvas.width / 2,
      100,
    );
    ctx.fillText(`ID: ${student.studentId}`, exportCanvas.width / 2, 118);

    // QR code
    ctx.drawImage(canvas, padding, 130);

    // Footer
    ctx.font = "11px Arial";
    ctx.fillStyle = "#a0aec0";
    ctx.textAlign = "center";
    ctx.fillText(
      "Show this QR code during attendance check.",
      exportCanvas.width / 2,
      exportCanvas.height - 10,
    );

    // Download
    const link = document.createElement("a");
    link.download = `QR_${student.studentId}_${student.lastName}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  }

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

        {/* Download Button */}
        <div style={styles.downloadWrapper}>
          <button style={styles.downloadBtn} onClick={handleDownload}>
            ⬇ Download QR as Image
          </button>
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
    padding: "1.5rem 1.5rem 0.5rem",
  },
  qrCanvas: {
    borderRadius: "8px",
  },
  downloadWrapper: {
    display: "flex",
    justifyContent: "center",
    padding: "0.75rem 1.5rem",
  },
  downloadBtn: {
    padding: "0.65rem 1.5rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#2c5282",
    color: "#fff",
    fontWeight: "600",
    fontSize: "0.9rem",
    cursor: "pointer",
    width: "100%",
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
