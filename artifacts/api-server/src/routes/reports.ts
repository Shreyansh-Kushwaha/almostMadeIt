import { Router, type IRouter } from "express";
import { db, reportsTable, classesTable, deliveryLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, createToken, type AuthRequest } from "../lib/auth";
import { GetReportParams } from "@workspace/api-zod";
import { getSessionById as getMongoSession } from "@workspace/mongo";
import { z } from "zod";
import { logger } from "../lib/logger";
import { generateAndStoreReportPdf } from "../lib/pdf";
import { sendReportEmail } from "../lib/email";

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

// Mint a token tied to the requester's identity so the Playwright browser
// can authenticate when it fetches /api/reports/:id from the print page.
function tokenForRequest(authReq: AuthRequest): string {
  if (authReq.teacher.wiseTeacherId) {
    return createToken({ role: authReq.role, wiseTeacherId: authReq.teacher.wiseTeacherId });
  }
  return createToken({ role: authReq.role, teacherId: authReq.teacher.id });
}

// Look up the report row (auth-scoped) — shared by /pdf and /send routes.
async function loadReportForRequest(
  authReq: AuthRequest,
  reportId: number,
): Promise<typeof reportsTable.$inferSelect | null> {
  if (authReq.role === "admin") {
    const [r] = await db.select().from(reportsTable).where(eq(reportsTable.id, reportId));
    return r ?? null;
  }
  if (authReq.teacher.wiseTeacherId) {
    const [r] = await db
      .select()
      .from(reportsTable)
      .where(
        and(
          eq(reportsTable.id, reportId),
          eq(reportsTable.wiseTeacherId, authReq.teacher.wiseTeacherId),
        ),
      );
    return r ?? null;
  }
  const [r] = await db
    .select()
    .from(reportsTable)
    .where(and(eq(reportsTable.id, reportId), eq(reportsTable.teacherId, authReq.teacher.id)));
  return r ?? null;
}

router.post("/reports/:reportId/pdf", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const rawId = Array.isArray(req.params.reportId) ? req.params.reportId[0] : req.params.reportId;
  const params = GetReportParams.safeParse({ reportId: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }
  const report = await loadReportForRequest(authReq, params.data.reportId);
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }
  try {
    const pdfUrl = await generateAndStoreReportPdf(report.id, {
      authToken: tokenForRequest(authReq),
    });
    // Cache the URL so the next download / send can skip re-rendering.
    await db.update(reportsTable).set({ pdfUrl }).where(eq(reportsTable.id, report.id));
    res.json({ pdfUrl });
  } catch (e) {
    const err = e as Error;
    logger.error({ err, reportId: report.id }, "PDF render failed");
    res.status(500).json({ error: `PDF render failed: ${err.message}` });
  }
});

const SendReportBody = z.object({
  recipientEmail: z.string().email().optional(),
});

router.post("/reports/:reportId/send", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const rawId = Array.isArray(req.params.reportId) ? req.params.reportId[0] : req.params.reportId;
  const params = GetReportParams.safeParse({ reportId: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }
  const body = SendReportBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const report = await loadReportForRequest(authReq, params.data.reportId);
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  // Recipient: explicit override > teacher's on-file email. Reports go to the
  // teacher who ran the session, not the parent.
  const recipient = (body.data.recipientEmail ?? "").trim() || authReq.teacher.email || "";

  // Resolve student/subject/date for the email body.
  const cls = report.classId
    ? (await db.select().from(classesTable).where(eq(classesTable.id, report.classId)))[0]
    : undefined;
  const synth = cls ? null : await enrichSynthClass(report);
  const studentName = cls?.studentName ?? synth?.studentName ?? "Student";
  const subject = cls?.subject ?? synth?.subject ?? "Class";
  const scheduledAtIso =
    cls?.scheduledAt?.toISOString?.() ?? synth?.scheduledAt ?? report.createdAt.toISOString();
  const scheduledAtPretty = new Date(scheduledAtIso).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Render PDF on demand if we don't already have one cached. (Teachers may
  // edit the report later; we currently treat the cached PDF as good — we
  // can add an "invalidate" flag when an edit endpoint exists.)
  let pdfUrl: string;
  if (report.pdfUrl) {
    pdfUrl = report.pdfUrl;
  } else {
    try {
      pdfUrl = await generateAndStoreReportPdf(report.id, {
        authToken: tokenForRequest(authReq),
      });
      await db.update(reportsTable).set({ pdfUrl }).where(eq(reportsTable.id, report.id));
    } catch (e) {
      const err = e as Error;
      logger.error({ err, reportId: report.id }, "PDF render failed in send flow");
      // Still record a failed delivery row so the admin Logs page surfaces it.
      await db.insert(deliveryLogsTable).values({
        reportId: report.id,
        channel: "email",
        status: "failed",
        recipient,
        intendedRecipient: authReq.teacher.email,
        pdfUrl: null,
        errorMessage: `pdf_render_failed: ${err.message}`.slice(0, 500),
        triggeredBy: `${authReq.role}:${authReq.teacher.email}`,
      });
      res.status(500).json({ error: `PDF render failed: ${err.message}` });
      return;
    }
  }

  const safeName = studentName.replace(/[^A-Za-z0-9]+/g, "_");
  const pdfFilename = `ClassPulse_Report_${safeName}_${report.id}.pdf`;

  const delivery = await sendReportEmail({
    toEmail: recipient,
    teacherName: authReq.teacher.name,
    studentName,
    subject,
    scheduledAtPretty,
    pdfUrl,
    pdfFilename,
    overallScore: report.overallScore,
    aiSummary: report.aiSummary ?? null,
    reportId: report.id,
  });

  // Audit-log every send attempt, regardless of outcome. The admin Logs page
  // reads from this table.
  await db.insert(deliveryLogsTable).values({
    reportId: report.id,
    channel: "email",
    status: delivery.status,
    recipient: recipient || null,
    intendedRecipient: authReq.teacher.email,
    pdfUrl,
    errorMessage: delivery.error,
    triggeredBy: `${authReq.role}:${authReq.teacher.email}`,
  });

  res.json({
    status: delivery.status,
    recipient: recipient || null,
    pdfUrl,
    error: delivery.error,
  });
});

export default router;
