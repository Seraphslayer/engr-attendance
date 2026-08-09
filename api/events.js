import { getDb } from "./lib/mongodb.js";
import { authenticate, setCors, requireRole } from "./lib/middleware.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const isPublicEventLookup = req.method === "GET" && req.query.id;
  const user = isPublicEventLookup ? null : authenticate(req, res);
  if (!isPublicEventLookup && !user) return;

  const db = await getDb();
  const id = req.query.id;

  // GET /api/events — list all events
  if (req.method === "GET" && !id) {
    try {
      const events = await db
        .collection("events")
        .find({})
        .sort({ date: -1 })
        .toArray();
      return res
        .status(200)
        .json(events.map((e) => ({ ...e, _id: e._id.toString() })));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // GET /api/events?id=xxx — get single event
  if (req.method === "GET" && id) {
    try {
      const event = await db
        .collection("events")
        .findOne({ _id: new ObjectId(id) });
      if (!event) return res.status(404).json({ error: "Event not found" });
      return res.status(200).json({ ...event, _id: event._id.toString() });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // POST /api/events — create event
  if (req.method === "POST") {
    try {
      const { name, date, description } = req.body;
      if (!name || !date)
        return res.status(400).json({ error: "Name and date are required" });

      const result = await db.collection("events").insertOne({
        name,
        date: new Date(date),
        description: description || "",
        createdBy: user.id,
        createdByName: user.name,
        createdAt: new Date(),
      });

      return res.status(201).json({ id: result.insertedId.toString() });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // PATCH /api/events?id=xxx — update event
  if (req.method === "PATCH" && id) {
    try {
      const { name, date, description } = req.body;
      await db.collection("events").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            name,
            date: new Date(date),
            description: description || "",
          },
        },
      );
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // DELETE /api/events?id=xxx — delete event (admin only)
  if (req.method === "DELETE" && id) {
    if (!requireRole(res, user, "admin")) return;
    try {
      await db.collection("events").deleteOne({ _id: new ObjectId(id) });
      // Also remove all attendance records for this event
      await db.collection("attendance").deleteMany({ eventId: id });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(404).json({ error: "Unknown route" });
}
