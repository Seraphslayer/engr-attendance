import { getDb } from "./lib/mongodb.js";
import { setCors } from "./lib/middleware.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const { token } = req.query;

  if (!token) return res.status(400).json({ error: "Token is required" });

  try {
    const db = await getDb();
    const student = await db
      .collection("students")
      .findOne({ qrToken: token }, { projection: { passwordHash: 0 } });

    if (!student) return res.status(404).json({ error: "Invalid QR token" });

    return res.status(200).json({
      id: student._id.toString(),
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      course: student.course,
      yearLevel: student.yearLevel,
      qrToken: student.qrToken,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
