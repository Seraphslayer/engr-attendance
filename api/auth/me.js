import { getDb } from "../lib/mongodb.js";
import { authenticate, setCors } from "../lib/middleware.js";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const user = authenticate(req, res);
  if (!user) return;

  try {
    const db = await getDb();
    const found = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(user.id) },
        { projection: { passwordHash: 0 } },
      );

    if (!found) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({
      id: found._id.toString(),
      email: found.email,
      role: found.role,
      name: found.name,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
