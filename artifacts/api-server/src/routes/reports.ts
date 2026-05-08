import { Router, type IRouter } from "express";
import { db, reportsTable, classesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { GetReportParams } from "@workspace/api-zod";

const router: IRouter = Router();

function formatReport(report: typeof reportsTable.$inferSelect, cls?: typeof classesTable.$inferSelect | null) {
  return {
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
  };
}

router.get("/reports", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const reports = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.teacherId, authReq.teacher.id))
    .orderBy(reportsTable.createdAt);

  const withClasses = await Promise.all(
    reports.map(async (r) => {
      const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, r.classId));
      return formatReport(r, cls);
    })
  );

  res.json(withClasses.reverse());
});

router.get("/reports/:reportId", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const rawId = Array.isArray(req.params.reportId) ? req.params.reportId[0] : req.params.reportId;
  const params = GetReportParams.safeParse({ reportId: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }

  const [report] = await db
    .select()
    .from(reportsTable)
    .where(and(eq(reportsTable.id, params.data.reportId), eq(reportsTable.teacherId, authReq.teacher.id)));

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, report.classId));
  res.json(formatReport(report, cls));
});

export default router;
