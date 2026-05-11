import { createHmac, randomBytes } from "crypto";
import {
  db,
  teachersTable,
  studentsTable,
  parentsTable,
  classesTable,
  churnPredictionsTable,
} from "@workspace/db";
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
  let teacherId = existing?.id;
  if (!existing) {
    const [created] = await db
      .insert(teachersTable)
      .values({
        name: "Dr. Alex Morgan",
        email: "teacher@supersheldon.com",
        passwordHash: hashPassword("123456"),
        subject: "Mathematics & Science",
        totalClasses: 10,
        avgScore: 91.5,
      })
      .returning();
    teacherId = created.id;
    logger.info("Demo teacher created");
  } else if (process.env.NODE_ENV !== "production") {
    await db
      .update(teachersTable)
      .set({ passwordHash: hashPassword("123456") })
      .where(eq(teachersTable.email, "teacher@supersheldon.com"));
    logger.info("Demo teacher password updated");
  }

  if (teacherId) await ensureClassPulseDemo(teacherId);
}

async function ensureClassPulseDemo(teacherId: number) {
  const demoStudents = [
    { name: "Aria Patel", email: "aria@example.com", grade: "8", subject: "Mathematics", churn: 18 },
    { name: "Noah Kim", email: "noah@example.com", grade: "9", subject: "Physics", churn: 64 },
    { name: "Sofia Rodriguez", email: "sofia@example.com", grade: "7", subject: "Chemistry", churn: 32 },
    { name: "Liam Chen", email: "liam@example.com", grade: "10", subject: "Mathematics", churn: 81 },
  ];

  for (const ds of demoStudents) {
    const [existing] = await db.select().from(studentsTable).where(eq(studentsTable.email, ds.email));
    let studentId = existing?.id;
    if (!existing) {
      const [created] = await db
        .insert(studentsTable)
        .values({
          name: ds.name,
          email: ds.email,
          grade: ds.grade,
          subject: ds.subject,
          primaryTeacherId: teacherId,
        })
        .returning();
      studentId = created.id;
    }
    if (!studentId) continue;

    // Parent
    const parentEmail = `${ds.name.split(" ")[0].toLowerCase()}.parent@example.com`;
    const [existingParent] = await db.select().from(parentsTable).where(eq(parentsTable.email, parentEmail));
    if (!existingParent) {
      await db.insert(parentsTable).values({
        studentId,
        name: `${ds.name.split(" ").slice(-1)[0]} Family`,
        email: parentEmail,
      });
    }

    // Link a couple of upcoming classes to this student so the teacher's
    // /students view picks them up.
    const cls = await db
      .select()
      .from(classesTable)
      .where(eq(classesTable.studentId, studentId));
    if (cls.length === 0) {
      const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
      await db.insert(classesTable).values({
        teacherId,
        studentId,
        studentName: ds.name,
        subject: ds.subject,
        scheduledAt: inDays(1),
        durationMinutes: 60,
        platform: "zoom",
        status: "upcoming",
        grade: ds.grade,
      });
    }

    // Seed a churn prediction snapshot
    const existingChurn = await db
      .select()
      .from(churnPredictionsTable)
      .where(eq(churnPredictionsTable.studentId, studentId));
    if (existingChurn.length === 0) {
      const reasons =
        ds.churn >= 70
          ? ["Engagement dropped 28% over last 3 sessions", "2 cancellations in last 30 days", "Long silent stretches in last lesson"]
          : ds.churn >= 45
          ? ["Engagement variance trending up", "Late starts on last 2 sessions", "Quiz accuracy below cohort"]
          : ["Engagement steady", "Attendance healthy", "Confidence scores improving"];
      await db.insert(churnPredictionsTable).values({
        studentId,
        riskScore: ds.churn,
        reasons,
        signals: [
          { name: "engagement_avg", value: 90 - Math.round(ds.churn * 0.6) },
          { name: "attendance_rate", value: 100 - Math.round(ds.churn * 0.4) },
          { name: "cancellations_30d", value: ds.churn >= 70 ? 2 : ds.churn >= 45 ? 1 : 0 },
        ],
      });
    }
  }

  logger.info("ClassPulse demo data ensured");
}
