import { getDb } from "./lib/mongodb.js";
import { signToken, verifyToken } from "./lib/jwt.js";
import { setCors } from "./lib/middleware.js";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action;

  // POST /api/auth?action=login
  if (req.method === "POST" && action === "login") {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    try {
      const db = await getDb();
      const user = await db
        .collection("users")
        .findOne({ email: email.toLowerCase() });
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      const token = signToken({
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      });

      return res.status(200).json({
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          name: user.name,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // GET /api/auth?action=me
  if (req.method === "GET" && action === "me") {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ error: "No token provided" });

    try {
      const token = authHeader.split(" ")[1];
      const decoded = verifyToken(token);
      const db = await getDb();
      const user = await db
        .collection("users")
        .findOne(
          { _id: new ObjectId(decoded.id) },
          { projection: { passwordHash: 0 } },
        );
      if (!user) return res.status(404).json({ error: "User not found" });

      return res.status(200).json({
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      });
    } catch (err) {
      console.error(err);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }

  return res.status(404).json({ error: "Unknown action" });
}
