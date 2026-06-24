import { verifyToken } from "./jwt.js";

export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function authenticate(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    return verifyToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}

export function requireRole(res, user, ...roles) {
  if (!roles.includes(user.role)) {
    res.status(403).json({ error: "Forbidden — insufficient role" });
    return false;
  }
  return true;
}
