import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";

export default function ScanPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [message, setMessage] = useState(null); // { type: "success"|"warning"|"error", text }
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const cooldownRef = useRef(false);

  useEffect(() => {
    fetchEvent();
    return () => stopScanner();
  }, []);

  async function fetchEvent() {
    try {
      const res = await fetch(`/api/events?id=${eventId}`);
      const data = await res.json();
      if (res.ok) setEvent(data);
    } catch {}
  }

  async function startScanner() {
    if (!scannerRef.current) return;
    try {
      html5QrRef.current = new Html5Qrcode("qr-reader");
      await html5QrRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 280 } },
        async (decodedText) => {
          if (cooldownRef.current) return;
          cooldownRef.current = true;

          const parts = decodedText.split("/qr/");
          const qrToken = parts[parts.length - 1];

          try {
            const res = await fetch("/api/attendance?scan=1", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ eventId, qrToken, method: "qr" }),
            });
            const data = await res.json();

            if (res.status === 409) {
              setMessage({
                type: "warning",
                text: `⚠️ ${data.student?.name} already marked present.`,
              });
            } else if (res.status === 404) {
              setMessage({ type: "error", text: "❌ Invalid QR code." });
            } else if (!res.ok) {
              setMessage({ type: "error", text: `❌ ${data.error}` });
            } else {
              setMessage({
                type: "success",
                text: `✅ ${data.student?.name} (${data.student?.course} Y${data.student?.yearLevel}) marked present!`,
              });
            }
          } catch {
            setMessage({ type: "error", text: "❌ Network error. Try again." });
          }

          // Allow next scan after 2.5 seconds
          setTimeout(() => {
            cooldownRef.current = false;
            setMessage(null);
          }, 2500);
        },
        () => {},
      );
      setScanning(true);
    } catch (err) {
      setMessage({ type: "error", text: "Camera error: " + err.message });
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
    setScanning(false);
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
          <h1 style={styles.headerTitle}>QR Scanner</h1>
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

        {/* Message */}
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

        {/* Scanner */}
        <div style={styles.scannerWrapper}>
          <div id="qr-reader" ref={scannerRef} style={styles.scannerBox} />
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          {!scanning ? (
            <button style={styles.startBtn} onClick={startScanner}>
              📷 Start Camera
            </button>
          ) : (
            <button style={styles.stopBtn} onClick={stopScanner}>
              ⏹ Stop Camera
            </button>
          )}
        </div>

        <p style={styles.hint}>
          Point the camera at a student's QR code to mark attendance.
        </p>
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
    maxWidth: "420px",
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
  eventName: {
    color: "#bee3f8",
    fontSize: "0.85rem",
    margin: "0.4rem 0 0",
  },
  messageBox: {
    margin: "1rem 1.25rem 0",
    padding: "0.85rem 1rem",
    borderRadius: "10px",
    fontSize: "0.95rem",
    fontWeight: "600",
    textAlign: "center",
  },
  scannerWrapper: {
    padding: "1.25rem",
    display: "flex",
    justifyContent: "center",
  },
  scannerBox: {
    width: "100%",
    maxWidth: "340px",
  },
  controls: {
    display: "flex",
    justifyContent: "center",
    paddingBottom: "1rem",
  },
  startBtn: {
    padding: "0.75rem 2rem",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#2c5282",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  stopBtn: {
    padding: "0.75rem 2rem",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#e53e3e",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
  },
  hint: {
    textAlign: "center",
    fontSize: "0.8rem",
    color: "#a0aec0",
    padding: "0 1.25rem 1.25rem",
  },
};
