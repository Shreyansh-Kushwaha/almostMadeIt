import { Router, type IRouter } from "express";
import { db, sessionsTable, classesTable, reportsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { StartSessionBody, FinishSessionParams } from "@workspace/api-zod";
import { generateAiReport } from "../lib/gemini";

const router: IRouter = Router();

router.post("/sessions/start", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const parsed = StartSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { classId } = parsed.data;

  // Finish any existing active sessions
  await db
    .update(sessionsTable)
    .set({ status: "finished", finishedAt: new Date() })
    .where(and(eq(sessionsTable.teacherId, authReq.teacher.id), eq(sessionsTable.status, "active")));

  // Update class status to in_progress
  await db.update(classesTable).set({ status: "in_progress" }).where(eq(classesTable.id, classId));

  const [session] = await db
    .insert(sessionsTable)
    .values({ classId, teacherId: authReq.teacher.id, status: "active" })
    .returning();

  res.status(201).json({
    id: session.id,
    classId: session.classId,
    teacherId: session.teacherId,
    startedAt: session.startedAt.toISOString(),
    status: session.status,
  });
});

router.get("/sessions/active", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.teacherId, authReq.teacher.id), eq(sessionsTable.status, "active")));

  if (!session) {
    res.json({ session: null, class: null });
    return;
  }

  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, session.classId));

  res.json({
    session: {
      id: session.id,
      classId: session.classId,
      teacherId: session.teacherId,
      startedAt: session.startedAt.toISOString(),
      status: session.status,
    },
    class: cls ? {
      id: cls.id,
      teacherId: cls.teacherId,
      studentName: cls.studentName,
      subject: cls.subject,
      scheduledAt: cls.scheduledAt.toISOString(),
      durationMinutes: cls.durationMinutes,
      platform: cls.platform,
      meetingUrl: cls.meetingUrl,
      status: cls.status,
      grade: cls.grade,
      notes: cls.notes,
    } : null,
  });
});

router.post("/sessions/:sessionId/finish", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const rawId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const params = FinishSessionParams.safeParse({ sessionId: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, params.data.sessionId), eq(sessionsTable.teacherId, authReq.teacher.id)));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Finish the session
  await db
    .update(sessionsTable)
    .set({ status: "finished", finishedAt: new Date() })
    .where(eq(sessionsTable.id, session.id));

  // Update class status to completed
  await db.update(classesTable).set({ status: "completed" }).where(eq(classesTable.id, session.classId));

  // Get class info for AI report
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, session.classId));

  // Generate AI report
  const reportData = await generateAiReport(cls?.studentName ?? "Student", cls?.subject ?? "Class", authReq.teacher.name);

  const [report] = await db
    .insert(reportsTable)
    .values({
      sessionId: session.id,
      classId: session.classId,
      teacherId: authReq.teacher.id,
      ...reportData,
    })
    .returning();

  res.json({
    id: report.id,
    sessionId: report.sessionId,
    classId: report.classId,
    teacherId: report.teacherId,
    overallScore: report.overallScore,
    engagementScore: report.engagementScore,
    voiceClarityScore: report.voiceClarityScore,
    interactionScore: report.interactionScore,
    noiseLevel: report.noiseLevel,
    speakingConfidence: report.speakingConfidence,
    deadAirSeconds: report.deadAirSeconds,
    internetStability: report.internetStability,
    aiSummary: report.aiSummary,
    suggestions: report.suggestions,
    highlights: report.highlights,
    improvementAreas: report.improvementAreas,
    timelineData: report.timelineData,
    createdAt: report.createdAt.toISOString(),
    class: cls ? {
      id: cls.id,
      teacherId: cls.teacherId,
      studentName: cls.studentName,
      subject: cls.subject,
      scheduledAt: cls.scheduledAt.toISOString(),
      durationMinutes: cls.durationMinutes,
      platform: cls.platform,
      meetingUrl: cls.meetingUrl,
      status: cls.status,
      grade: cls.grade,
      notes: cls.notes,
    } : null,
  });
});

export default router;
