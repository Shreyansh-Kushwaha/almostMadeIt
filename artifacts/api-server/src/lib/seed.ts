import { createHmac, randomBytes } from "crypto";
import { db, teachersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const SECRET = process.env.SESSION_SECRET ?? "super-sheldon-secret-key";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHmac("sha256", SECRET).update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

export async function ensureDemoTeacher() {
  if (process.env.SEED_DEMO === "false") {
    logger.info("SEED_DEMO=false — skipping demo teacher seed");
    return;
  }

  const [existing] = await db.select().from(teachersTable).where(eq(teachersTable.email, "teacher@supersheldon.com"));
  if (!existing) {
    await db.insert(teachersTable).values({
      name: "Dr. Alex Morgan",
      email: "teacher@supersheldon.com",
      passwordHash: hashPassword("123456"),
      subject: "Mathematics & Science",
      totalClasses: 10,
      avgScore: 91.5,
    });
    logger.info("Demo teacher created");
  } else if (process.env.NODE_ENV !== "production") {
    await db.update(teachersTable)
      .set({ passwordHash: hashPassword("123456") })
      .where(eq(teachersTable.email, "teacher@supersheldon.com"));
    logger.info("Demo teacher password updated");
  }
}
