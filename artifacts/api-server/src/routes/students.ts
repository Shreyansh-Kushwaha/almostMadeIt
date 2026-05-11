import { Router, type IRouter } from "express";
import { db, studentsTable, classesTable, reportsTable, churnPredictionsTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
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

// Stable negative-id hash so synthesized students keep the same key across
// requests (lets the frontend deep-link them and use them as React keys).
function syntheticIdFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return -Math.abs(h) || -1;
}

router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  // A teacher's students come from three sources, in priority order:
  //   1. Real student rows where primaryTeacherId = current teacher
  //   2. Real student rows linked via classes.studentId
  //   3. Synthesized students derived from class.studentName when no FK exists
  //      (common in legacy data where classes have a name but no student row)
  const direct = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.primaryTeacherId, authReq.teacher.id));

  const cls = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.teacherId, authReq.teacher.id));

  const linkedIds = new Set<number>();
  for (const c of cls) {
    if (c.studentId != null) linkedIds.add(c.studentId);
  }
  const directIds = new Set(direct.map((s) => s.id));
  const missingIds = [...linkedIds].filter((id) => !directIds.has(id));

  let extra: (typeof studentsTable.$inferSelect)[] = [];
  for (const id of missingIds) {
    const [s] = await db.select().from(studentsTable).where(eq(studentsTable.id, id));
    if (s) extra.push(s);
  }

  const realStudents = [...direct, ...extra];
  const realNames = new Set(realStudents.map((s) => s.name.trim().toLowerCase()));

  // Synthesize from class.studentName when nothing else covers it.
  const synthByName = new Map<string, typeof classesTable.$inferSelect>();
  for (const c of cls) {
    const key = c.studentName.trim().toLowerCase();
    if (!realNames.has(key) && !synthByName.has(key)) synthByName.set(key, c);
  }
  const synthesized = [...synthByName.values()].map((c) => ({
    id: syntheticIdFromName(c.studentName.trim().toLowerCase()),
    name: c.studentName,
    email: null,
    grade: c.grade,
    subject: c.subject,
    primaryTeacherId: authReq.teacher.id,
    avatarUrl: null,
  }));

  res.json([...realStudents.map(formatStudent), ...synthesized]);
});

function reportRow(r: typeof reportsTable.$inferSelect) {
  return {
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
  };
}

router.get("/students/:studentId", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const studentId = parseInt(String(req.params.studentId), 10);
  if (!Number.isFinite(studentId)) {
    res.status(400).json({ error: "Invalid student ID" });
    return;
  }

  // Synthesized students live behind negative IDs (see GET /students). Recover
  // the source class by hash-matching against this teacher's class list, then
  // assemble a partial profile from class history.
  if (studentId < 0) {
    const teacherClasses = await db
      .select()
      .from(classesTable)
      .where(eq(classesTable.teacherId, authReq.teacher.id));
    const match = teacherClasses.find(
      (c) => syntheticIdFromName(c.studentName.trim().toLowerCase()) === studentId,
    );
    if (!match) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    const sameName = teacherClasses.filter(
      (c) => c.studentName.trim().toLowerCase() === match.studentName.trim().toLowerCase(),
    );
    const classIds = sameName.map((c) => c.id);
    const recentReports = classIds.length
      ? await db
          .select()
          .from(reportsTable)
          .where(inArray(reportsTable.classId, classIds))
          .orderBy(desc(reportsTable.createdAt))
      : [];

    res.json({
      id: studentId,
      name: match.studentName,
      email: null,
      grade: match.grade,
      subject: match.subject,
      primaryTeacherId: authReq.teacher.id,
      avatarUrl: null,
      recentReports: recentReports.map(reportRow),
      churn: null,
    });
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
    recentReports: recentReports.map(reportRow),
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
