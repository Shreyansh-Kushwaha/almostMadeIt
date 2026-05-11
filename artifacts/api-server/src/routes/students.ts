import { Router, type IRouter } from "express";
import { db, studentsTable, classesTable, reportsTable, churnPredictionsTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import {
  listStudents as listMongoStudents,
  getStudentById as getMongoStudent,
  getStudentsByTeacher as getMongoStudentsByTeacher,
} from "@workspace/mongo";

const router: IRouter = Router();

function formatStudent(
  s: typeof studentsTable.$inferSelect,
  classCount = 0,
) {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    grade: s.grade,
    subject: s.subject,
    primaryTeacherId: s.primaryTeacherId,
    avatarUrl: s.avatarUrl,
    classCount,
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
  // ── Wise (Mongo) teacher → read enrolled students from Wise directly. ──
  // The mongo service does a teacher → classroom_teachers → student_classrooms
  // → wise_students two-hop join.
  if (authReq.teacher.wiseTeacherId && authReq.role !== "admin") {
    const wiseStudents = await getMongoStudentsByTeacher(authReq.teacher.wiseTeacherId);
    res.json(
      wiseStudents.map((s) => ({
        id: s.wise_student_id,
        name: s.name ?? "Student",
        email: s.email,
        grade: s.grade,
        subject: s.subject,
        primaryTeacherId: null,
        avatarUrl: null,
        classCount: s.classes?.length ?? 0,
      }))
    );
    return;
  }

  // ── Admin role → return ALL Wise students globally. ──
  if (authReq.role === "admin") {
    const all = await listMongoStudents({ limit: 5000 });
    res.json(
      all.map((s) => ({
        id: s.wise_student_id,
        name: s.name ?? "Student",
        email: s.email,
        grade: s.grade,
        subject: s.subject,
        primaryTeacherId: null,
        avatarUrl: null,
        classCount: s.classes?.length ?? 0,
      }))
    );
    return;
  }

  // ── Legacy Supabase teacher (no Wise ID) → keep the old behavior. ──
  const isAdmin = false; // already handled above
  const direct = isAdmin
    ? await db.select().from(studentsTable)
    : await db
        .select()
        .from(studentsTable)
        .where(eq(studentsTable.primaryTeacherId, authReq.teacher.id));

  const cls = isAdmin
    ? await db.select().from(classesTable)
    : await db
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

  // Count classes per student (by FK studentId and by name for synthesized).
  const classCountById = new Map<number, number>();
  const classCountByName = new Map<string, number>();
  for (const c of cls) {
    if (c.studentId != null) {
      classCountById.set(c.studentId, (classCountById.get(c.studentId) ?? 0) + 1);
    }
    const key = c.studentName.trim().toLowerCase();
    classCountByName.set(key, (classCountByName.get(key) ?? 0) + 1);
  }

  // Synthesize from class.studentName when nothing else covers it.
  const synthByName = new Map<string, typeof classesTable.$inferSelect>();
  for (const c of cls) {
    const key = c.studentName.trim().toLowerCase();
    if (!realNames.has(key) && !synthByName.has(key)) synthByName.set(key, c);
  }
  const synthesized = [...synthByName.values()].map((c) => {
    const key = c.studentName.trim().toLowerCase();
    return {
      id: syntheticIdFromName(key),
      name: c.studentName,
      email: null,
      grade: c.grade,
      subject: c.subject,
      primaryTeacherId: authReq.teacher.id,
      avatarUrl: null,
      classCount: classCountByName.get(key) ?? 0,
    };
  });

  res.json([
    ...realStudents.map((s) => {
      // Prefer FK count when present, fall back to a name match for safety.
      const byId = classCountById.get(s.id) ?? 0;
      const byName = classCountByName.get(s.name.trim().toLowerCase()) ?? 0;
      return formatStudent(s, byId || byName);
    }),
    ...synthesized,
  ]);
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
  const rawId = String(req.params.studentId);

  // ── Mongo string ID (24-char hex Wise ObjectId-as-string) ──
  if (/^[a-fA-F0-9]{24}$/.test(rawId)) {
    const ws = await getMongoStudent(rawId);
    if (!ws) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    const wiseReports = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.wiseStudentId, ws.wise_student_id))
      .orderBy(desc(reportsTable.createdAt));
    const [churn] = await db
      .select()
      .from(churnPredictionsTable)
      .where(eq(churnPredictionsTable.wiseStudentId, ws.wise_student_id))
      .orderBy(desc(churnPredictionsTable.computedAt));

    res.json({
      id: ws.wise_student_id,
      name: ws.name ?? "Student",
      email: ws.email,
      grade: ws.grade,
      subject: ws.subject,
      primaryTeacherId: null,
      avatarUrl: null,
      classCount: ws.classes?.length ?? 0,
      recentReports: wiseReports.map(reportRow),
      churn: churn
        ? {
            id: churn.id,
            studentId: churn.wiseStudentId ?? churn.studentId,
            riskScore: churn.riskScore,
            reasons: churn.reasons,
            signals: churn.signals,
            computedAt: churn.computedAt.toISOString(),
          }
        : null,
    });
    return;
  }

  const studentId = parseInt(rawId, 10);
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
