import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

async function seed() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("engr-attendance");

  // Clear existing users
  await db.collection("users").deleteMany({});

  const passwordHash = await bcrypt.hash("Admin@1234", 10);

  await db.collection("users").insertMany([
    {
      name: "Super Admin",
      email: "admin@engr.edu.ph",
      passwordHash,
      role: "admin",
    },
    {
      name: "Officer One",
      email: "officer1@engr.edu.ph",
      passwordHash: await bcrypt.hash("Officer@1234", 10),
      role: "officer",
    },
    {
      name: "Officer Two",
      email: "officer2@engr.edu.ph",
      passwordHash: await bcrypt.hash("Officer@1234", 10),
      role: "officer",
    },
  ]);

  console.log("✅ Seeded users:");
  console.log("  admin@engr.edu.ph        → Admin@1234   (Admin)");
  console.log("  officer1@engr.edu.ph     → Officer@1234 (Officer)");
  console.log("  officer2@engr.edu.ph     → Officer@1234 (Officer)");

  await client.close();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
