import { Router, type IRouter } from "express";
import {
  db,
  teachersTable,
  studentsTable,
  classesTable,
  reportsTable,
  sessionsTable,
  churnPredictionsTable,
} from "@workspace/db";
import { eq, desc, gte, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/admin/teachers", requireAuth, async (_req, res): Promise<void> => {
  const teachers = await db.select().from(teachersTable);
  const out: any[] = [];
  for (const t of teachers) {
    const reps = await db.select().from(reportsTable).where(eq(reportsTable.teacherId, t.id));
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sessions30d = await db
      .select()
      .from(sessionsTable)
      .where(and(eq(sessionsTable.teacherId, t.id), gte(sessionsTable.startedAt, since)));
    const avg = (k: keyof typeof reportsTable.$inferSelect) =>
      reps.length ? reps.reduce((a, r) => a + (Number(r[k] ?? 0) || 0), 0) / reps.length : 0;
    out.push({
      teacher: {
        id: t.id,
        name: t.name,
        email: t.email,
        subject: t.subject,
        avatarUrl: t.avatarUrl,
        totalClasses: t.totalClasses,
        avgScore: t.avgScore,
      },
      avgEngagement: round(avg("engagementScore")),
      avgUnderstanding: round(avg("understandingScore")),
      churnRiskAvg: round(avg("churnRiskScore")),
      sessionsLast30d: sessions30d.length,
    });
  }
  res.json(out);
});

router.get("/admin/students", requireAuth, async (_req, res): Promise<void> => {
  const students = await db.select().from(studentsTable);
  const out: any[] = [];
  for (const s of students) {
    const cls = await db.select().from(classesTable).where(eq(classesTable.studentId, s.id));
    const reps: (typeof reportsTable.$inferSelect)[] = [];
    for (const c of cls) {
      const rs = await db.select().from(reportsTable).where(eq(reportsTable.classId, c.id));
      reps.push(...rs);
    }
    const [churn] = await db
      .select()
      .from(churnPredictionsTable)
      .where(eq(churnPredictionsTable.studentId, s.id))
      .orderBy(desc(churnPredictionsTable.computedAt));
    const avgEng = reps.length ? reps.reduce((a, r) => a + r.engagementScore, 0) / reps.length : 0;
    const avgUnd = reps.length
      ? reps.reduce((a, r) => a + (r.understandingScore ?? 0), 0) / reps.length
      : 0;
    const lastSession = reps.length
      ? reps.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
      : null;
    out.push({
      student: {
        id: s.id,
        name: s.name,
        email: s.email,
        grade: s.grade,
        subject: s.subject,
        primaryTeacherId: s.primaryTeacherId,
        avatarUrl: s.avatarUrl,
      },
      avgEngagement: round(avgEng),
      avgUnderstanding: round(avgUnd),
      churnRiskScore: churn ? round(churn.riskScore) : 0,
      lastSessionAt: lastSession ? lastSession.toISOString() : null,
    });
  }
  res.json(out);
});

router.get("/admin/retention", requireAuth, async (_req, res): Promise<void> => {
  const students = await db.select().from(studentsTable);
  const totalStudents = students.length;
  let atRisk = 0;
  const buckets = { Low: 0, Medium: 0, High: 0, Critical: 0 } as Record<string, number>;
  for (const s of students) {
    const [latest] = await db
      .select()
      .from(churnPredictionsTable)
      .where(eq(churnPredictionsTable.studentId, s.id))
      .orderBy(desc(churnPredictionsTable.computedAt));
    const r = latest?.riskScore ?? 0;
    if (r >= 50) atRisk++;
    if (r < 25) buckets.Low++;
    else if (r < 50) buckets.Medium++;
    else if (r < 75) buckets.High++;
    else buckets.Critical++;
  }
  res.json({
    totalStudents,
    atRisk,
    churned30d: 0,
    retainedRate: totalStudents > 0 ? round((totalStudents - atRisk) / totalStudents) : 1,
    riskBuckets: Object.entries(buckets).map(([label, count]) => ({ label, count })),
  });
});

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export default router;
