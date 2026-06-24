import { getDb } from "./lib/mongodb.js";
import { authenticate, setCors } from "./lib/middleware.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const user = authenticate(req, res);
  if (!user) return;

  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const db = await getDb();

    // Total students per course
    const studentsByCourse = await db
      .collection("students")
      .aggregate([
        { $group: { _id: "$course", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // Total students
    const totalStudents = await db.collection("students").countDocuments();

    // Total events
    const totalEvents = await db.collection("events").countDocuments();

    // Recent events (last 5)
    const recentEvents = await db
      .collection("events")
      .find({})
      .sort({ date: -1 })
      .limit(5)
      .toArray();

    // Attendance count per event
    const eventIds = recentEvents.map((e) => e._id.toString());
    const attendanceCounts = await db
      .collection("attendance")
      .aggregate([
        { $match: { eventId: { $in: eventIds } } },
        { $group: { _id: "$eventId", count: { $sum: 1 } } },
      ])
      .toArray();

    const attendanceMap = {};
    attendanceCounts.forEach((a) => {
      attendanceMap[a._id] = a.count;
    });

    const eventsWithCount = recentEvents.map((e) => ({
      ...e,
      _id: e._id.toString(),
      attendanceCount: attendanceMap[e._id.toString()] || 0,
    }));

    // Attendance by course for latest event
    let attendanceByCourse = [];
    if (recentEvents.length > 0) {
      const latestEventId = recentEvents[0]._id.toString();
      const latestRecords = await db
        .collection("attendance")
        .find({ eventId: latestEventId })
        .toArray();

      const studentIds = latestRecords.map((r) => new ObjectId(r.studentId));
      const students = await db
        .collection("students")
        .find({ _id: { $in: studentIds } })
        .toArray();

      const courseCounts = {};
      students.forEach((s) => {
        courseCounts[s.course] = (courseCounts[s.course] || 0) + 1;
      });

      attendanceByCourse = Object.entries(courseCounts).map(
        ([course, count]) => ({
          course,
          count,
        }),
      );
    }

    return res.status(200).json({
      totalStudents,
      totalEvents,
      studentsByCourse,
      recentEvents: eventsWithCount,
      attendanceByCourse,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
