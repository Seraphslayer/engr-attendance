import { getDb } from "./lib/mongodb.js";
import { authenticate, setCors } from "./lib/middleware.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const isScan = req.query.scan === "1";
  const user = isScan
    ? { id: "scanner", name: "QR Scanner" }
    : authenticate(req, res);
  if (!user) return;

  const db = await getDb();
  const id = req.query.id;
  const eventId = req.query.eventId;

  // GET /api/attendance?eventId=xxx — get attendance for an event
  if (req.method === "GET" && eventId) {
    try {
      const records = await db
        .collection("attendance")
        .find({ eventId })
        .sort({ timestamp: 1 })
        .toArray();

      // Enrich with student info
      const studentIds = records.map((r) => r.studentId);
      const students = await db
        .collection("students")
        .find({ _id: { $in: studentIds.map((sid) => new ObjectId(sid)) } })
        .toArray();

      const studentMap = {};
      students.forEach((s) => {
        studentMap[s._id.toString()] = s;
      });

      const enriched = records.map((r) => ({
        ...r,
        _id: r._id.toString(),
        student: studentMap[r.studentId] || null,
      }));

      return res.status(200).json(enriched);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // POST /api/attendance — mark attendance (QR or manual)
  if (req.method === "POST") {
    try {
      const { eventId, studentId, method } = req.body;

      if (!eventId || (!studentId && !req.body.qrToken))
        return res
          .status(400)
          .json({ error: "eventId and studentId or qrToken are required" });

      let student;

      // QR scan — find student by qrToken
      if (req.body.qrToken) {
        student = await db
          .collection("students")
          .findOne({ qrToken: req.body.qrToken });
        if (!student) return res.status(404).json({ error: "Invalid QR code" });
      } else {
        student = await db
          .collection("students")
          .findOne({ _id: new ObjectId(studentId) });
        if (!student)
          return res.status(404).json({ error: "Student not found" });
      }

      // Check if already marked
      const existing = await db.collection("attendance").findOne({
        eventId,
        studentId: student._id.toString(),
      });

      if (existing)
        return res.status(409).json({
          error: "Already marked present",
          student: {
            name: `${student.firstName} ${student.lastName}`,
            course: student.course,
          },
        });

      // Check event exists
      const event = await db
        .collection("events")
        .findOne({ _id: new ObjectId(eventId) });
      if (!event) return res.status(404).json({ error: "Event not found" });

      await db.collection("attendance").insertOne({
        eventId,
        studentId: student._id.toString(),
        method: method || "manual",
        markedBy: user.id,
        markedByName: user.name,
        timestamp: new Date(),
      });

      return res.status(201).json({
        success: true,
        student: {
          name: `${student.firstName} ${student.lastName}`,
          course: student.course,
          yearLevel: student.yearLevel,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // DELETE /api/attendance?id=xxx — remove attendance record
  if (req.method === "DELETE" && id) {
    try {
      await db.collection("attendance").deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(404).json({ error: "Unknown route" });
}
