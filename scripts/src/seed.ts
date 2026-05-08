import { createHmac, randomBytes } from "crypto";
import pg from "pg";

const { Client } = pg;

const SECRET = process.env.SESSION_SECRET ?? "super-sheldon-secret-key";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHmac("sha256", SECRET).update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const passwordHash = hashPassword("123456");

  await client.query(
    `UPDATE teachers SET password_hash = $1 WHERE email = $2`,
    [passwordHash, "teacher@supersheldon.com"]
  );

  console.log("Password re-seeded successfully for teacher@supersheldon.com");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
