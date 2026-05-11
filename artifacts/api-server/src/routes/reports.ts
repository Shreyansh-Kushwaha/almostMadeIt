import { Router, type IRouter } from "express";
import { db, reportsTable, classesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { GetReportParams } from "@workspace/api-zod";
import { getSessionById as getMongoSession } from "@workspace/mongo";

const router: IRouter = Router();

function formatReport(
  report: typeof reportsTable.$inferSelect,
  cls?: typeof classesTable.$inferSelect | null,
  synthClass?: { studentName: string; subject: string; durationMinutes: number; scheduledAt: string } | null,
) {
  return {
    id: report.id,
    sessionId: report.sessionId,
    classId: report.classId,
    teacherId: report.teacherId,
    wiseSessionId: report.wiseSessionId,
    wiseTeacherId: report.wiseTeacherId,
    overallScore: report.overallScore,
    engagementScore: report.engagementScore,
    voiceClarityScore: report.voiceClarityScore,
    interactionScore: report.interactionScore,
    noiseLevel: report.noiseLevel,
    speakingConfidence: report.speakingConfidence,
    deadAirSeconds: report.deadAirSeconds,
    internetStability: report.internetStability,
    understandingScore: report.understandingScore,
    satisfactionScore: report.satisfactionScore,
    teacherCompatibilityScore: report.teacherCompatibilityScore,
    churnRiskScore: report.churnRiskScore,
    aiSummary: report.aiSummary,
    suggestions: report.suggestions,
    highlights: report.highlights,
    improvementAreas: report.improvementAreas,
    timelineData: report.timelineData,
    moodTimeline: report.moodTimeline,
    confusionTimeline: report.confusionTimeline,
    createdAt: report.createdAt.toISOString(),
    class: cls
      ? {
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
        }
      : synthClass
        ? {
            id: report.wiseClassId ?? 0,
            teacherId: report.wiseTeacherId ?? 0,
            studentName: synthClass.studentName,
            subject: synthClass.subject,
            scheduledAt: synthClass.scheduledAt,
            durationMinutes: synthClass.durationMinutes,
            platform: "wise",
            meetingUrl: null,
            status: "completed",
            grade: null,
            notes: null,
          }
        : null,
  };
}

async function enrichSynthClass(report: typeof reportsTable.$inferSelect) {
  if (!report.wiseSessionId) return null;
  const ws = await getMongoSession(report.wiseSessionId);
  if (!ws) return null;
  const classObj = ws.classId && typeof ws.classId === "object" ? ws.classId : null;
  const start = new Date(ws.scheduledStartTime);
  const end = new Date(ws.scheduledEndTime);
  return {
    studentName: classObj?.name ?? ws.class_name ?? "Student",
    subject: classObj?.subject ?? "Class",
    durationMinutes: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000)),
    scheduledAt: start.toISOString(),
  };
}

router.get("/reports", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  // Admin sees ALL reports; Wise teachers see their Wise-keyed reports;
  // Supabase teachers see their int-keyed reports.
  const reports = authReq.role === "admin"
    ? await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt))
    : authReq.teacher.wiseTeacherId
      ? await db
          .select()
          .from(reportsTable)
          .where(eq(reportsTable.wiseTeacherId, authReq.teacher.wiseTeacherId))
          .orderBy(desc(reportsTable.createdAt))
      : await db
          .select()
          .from(reportsTable)
          .where(eq(reportsTable.teacherId, authReq.teacher.id))
          .orderBy(desc(reportsTable.createdAt));

  const out = await Promise.all(
    reports.map(async (r) => {
      const cls = r.classId
        ? (await db.select().from(classesTable).where(eq(classesTable.id, r.classId)))[0]
        : undefined;
      const synth = cls ? null : await enrichSynthClass(r);
      return formatReport(r, cls ?? null, synth);
    }),
  );
  res.json(out);
});

router.get("/reports/:reportId", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const rawId = Array.isArray(req.params.reportId) ? req.params.reportId[0] : req.params.reportId;
  const params = GetReportParams.safeParse({ reportId: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }

  const [report] = authReq.role === "admin"
    ? await db.select().from(reportsTable).where(eq(reportsTable.id, params.data.reportId))
    : authReq.teacher.wiseTeacherId
      ? await db
          .select()
          .from(reportsTable)
          .where(and(eq(reportsTable.id, params.data.reportId), eq(reportsTable.wiseTeacherId, authReq.teacher.wiseTeacherId)))
      : await db
          .select()
          .from(reportsTable)
          .where(and(eq(reportsTable.id, params.data.reportId), eq(reportsTable.teacherId, authReq.teacher.id)));

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  const cls = report.classId
    ? (await db.select().from(classesTable).where(eq(classesTable.id, report.classId)))[0]
    : undefined;
  const synth = cls ? null : await enrichSynthClass(report);
  res.json(formatReport(report, cls ?? null, synth));
});

export default router;
