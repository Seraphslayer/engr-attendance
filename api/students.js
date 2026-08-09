import { getDb } from "./lib/mongodb.js";
import { authenticate, setCors, requireRole } from "./lib/middleware.js";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action;
  const id = req.query.id;

  const isPublicRegister =
    req.method === "POST" && !action && !req.headers.authorization;
  const isPublicLookup = req.method === "GET" && action === "lookup";

  let user = null;
  if (!isPublicRegister && !isPublicLookup) {
    user = authenticate(req, res);
    if (!user) return;
  }

  const db = await getDb();

  // GET /api/students?action=lookup&search=xxx — public, limited fields for check-in
  if (isPublicLookup) {
    try {
      const { search } = req.query;
      if (!search || search.length < 2) return res.status(200).json([]);

      const filter = {
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { studentId: { $regex: search, $options: "i" } },
        ],
      };

      const students = await db
        .collection("students")
        .find(filter)
        .project({
          studentId: 1,
          firstName: 1,
          lastName: 1,
          course: 1,
          yearLevel: 1,
          section: 1,
        })
        .limit(10)
        .toArray();

      return res
        .status(200)
        .json(students.map((s) => ({ ...s, _id: s._id.toString() })));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // GET /api/students — list all with optional filters
  if (req.method === "GET" && !action && !id) {
    try {
      const { course, year, search, section } = req.query;
      const filter = {};
      if (course) filter.course = course;
      if (year) filter.yearLevel = parseInt(year);
      if (section) filter.section = section;
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { studentId: { $regex: search, $options: "i" } },
        ];
      }
      const students = await db
        .collection("students")
        .find(filter)
        .sort({ lastName: 1 })
        .toArray();
      return res
        .status(200)
        .json(students.map((s) => ({ ...s, _id: s._id.toString() })));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // GET /api/students?id=xxx — get single student
  if (req.method === "GET" && id) {
    try {
      const student = await db
        .collection("students")
        .findOne({ _id: new ObjectId(id) });
      if (!student) return res.status(404).json({ error: "Student not found" });
      return res.status(200).json({ ...student, _id: student._id.toString() });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // POST /api/students — register one student (public or admin)
  if (req.method === "POST" && !action) {
    if (!isPublicRegister && !requireRole(res, user, "admin")) return;
    try {
      const {
        studentId,
        firstName,
        lastName,
        course,
        yearLevel,
        email,
        section,
      } = req.body;
      if (
        !studentId ||
        !firstName ||
        !lastName ||
        !course ||
        !yearLevel ||
        !section
      )
        return res.status(400).json({ error: "Missing required fields" });

      const existing = await db.collection("students").findOne({ studentId });
      if (existing)
        return res.status(409).json({ error: "Student ID already exists" });

      const qrToken = uuidv4();
      const result = await db.collection("students").insertOne({
        studentId,
        firstName,
        lastName,
        course,
        yearLevel: parseInt(yearLevel),
        section,
        email: email || "",
        qrToken,
        createdAt: new Date(),
      });

      return res
        .status(201)
        .json({ id: result.insertedId.toString(), qrToken });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // POST /api/students?action=import — bulk import from Excel (admin only)
  if (req.method === "POST" && action === "import") {
    if (!requireRole(res, user, "admin")) return;
    try {
      const { students } = req.body;
      if (!Array.isArray(students) || students.length === 0)
        return res.status(400).json({ error: "No students provided" });

      const docs = students.map((s) => ({
        studentId: s.studentId?.toString(),
        firstName: s.firstName,
        lastName: s.lastName,
        course: s.course,
        yearLevel: parseInt(s.yearLevel),
        section: s.section || "",
        email: s.email || "",
        qrToken: uuidv4(),
        createdAt: new Date(),
      }));

      const existingIds = await db
        .collection("students")
        .find({ studentId: { $in: docs.map((d) => d.studentId) } })
        .project({ studentId: 1 })
        .toArray();

      const existingSet = new Set(existingIds.map((e) => e.studentId));
      const newDocs = docs.filter((d) => !existingSet.has(d.studentId));

      if (newDocs.length === 0)
        return res.status(409).json({ error: "All students already exist" });

      await db.collection("students").insertMany(newDocs);
      return res.status(201).json({
        inserted: newDocs.length,
        skipped: docs.length - newDocs.length,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // PATCH /api/students?id=xxx — update student (admin only)
  if (req.method === "PATCH" && id) {
    if (!requireRole(res, user, "admin")) return;
    try {
      const { firstName, lastName, course, yearLevel, email, section } =
        req.body;
      await db.collection("students").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            firstName,
            lastName,
            course,
            yearLevel: parseInt(yearLevel),
            section: section || "",
            email,
          },
        },
      );
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // DELETE /api/students?id=xxx — delete student (admin only)
  if (req.method === "DELETE" && id) {
    if (!requireRole(res, user, "admin")) return;
    try {
      await db.collection("students").deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(404).json({ error: "Unknown route" });
}
