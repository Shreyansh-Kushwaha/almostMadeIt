import { Router, type IRouter } from "express";
import { db, studentsTable, classesTable, reportsTable, churnPredictionsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

function formatStudent(s: typeof studentsTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    grade: s.grade,
    subject: s.subject,
    primaryTeacherId: s.primaryTeacherId,
    avatarUrl: s.avatarUrl,
  };
}

router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  // A teacher's students = students named in any of their classes (by id) plus
  // any students whose primaryTeacherId is the current teacher.
  const direct = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.primaryTeacherId, authReq.teacher.id));

  // Also fetch students linked through this teacher's classes
  const cls = await db.select().from(classesTable).where(eq(classesTable.teacherId, authReq.teacher.id));
  const linkedIds = new Set<number>();
  for (const c of cls) {
    if (c.studentId != null) linkedIds.add(c.studentId);
  }
  const directIds = new Set(direct.map((s) => s.id));
  const missingIds = [...linkedIds].filter((id) => !directIds.has(id));

  let extra: (typeof studentsTable.$inferSelect)[] = [];
  if (missingIds.length > 0) {
    extra = await db.select().from(studentsTable).where(eq(studentsTable.id, missingIds[0]!));
    for (const id of missingIds.slice(1)) {
      const [s] = await db.select().from(studentsTable).where(eq(studentsTable.id, id));
      if (s) extra.push(s);
    }
  }

  res.json([...direct, ...extra].map(formatStudent));
});

router.get("/students/:studentId", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const studentId = parseInt(String(req.params.studentId), 10);
  if (!Number.isFinite(studentId)) {
    res.status(400).json({ error: "Invalid student ID" });
    return;
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  // Recent reports across this student's classes (this teacher only)
  const cls = await db
    .select()
    .from(classesTable)
    .where(and(eq(classesTable.studentId, studentId), eq(classesTable.teacherId, authReq.teacher.id)));
  const classIds = cls.map((c) => c.id);
  const recentReports = classIds.length
    ? await db
        .select()
        .from(reportsTable)
        .where(eq(reportsTable.classId, classIds[0]!))
        .orderBy(desc(reportsTable.createdAt))
    : [];

  const [churn] = await db
    .select()
    .from(churnPredictionsTable)
    .where(eq(churnPredictionsTable.studentId, studentId))
    .orderBy(desc(churnPredictionsTable.computedAt));

  res.json({
    ...formatStudent(student),
    recentReports: recentReports.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      classId: r.classId,
      teacherId: r.teacherId,
      overallScore: r.overallScore,
      engagementScore: r.engagementScore,
      voiceClarityScore: r.voiceClarityScore,
      interactionScore: r.interactionScore,
      noiseLevel: r.noiseLevel,
      speakingConfidence: r.speakingConfidence,
      deadAirSeconds: r.deadAirSeconds,
      internetStability: r.internetStability,
      understandingScore: r.understandingScore,
      satisfactionScore: r.satisfactionScore,
      teacherCompatibilityScore: r.teacherCompatibilityScore,
      churnRiskScore: r.churnRiskScore,
      aiSummary: r.aiSummary,
      suggestions: r.suggestions,
      highlights: r.highlights,
      improvementAreas: r.improvementAreas,
      timelineData: r.timelineData,
      moodTimeline: r.moodTimeline,
      confusionTimeline: r.confusionTimeline,
      createdAt: r.createdAt.toISOString(),
    })),
    churn: churn
      ? {
          id: churn.id,
          studentId: churn.studentId,
          riskScore: churn.riskScore,
          reasons: churn.reasons,
          signals: churn.signals,
          computedAt: churn.computedAt.toISOString(),
        }
      : null,
  });
});

export default router;
