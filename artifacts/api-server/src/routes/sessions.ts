import { Router, type IRouter } from "express";
import { db, sessionsTable, classesTable, reportsTable, transcriptsTable, teachersTable } from "@workspace/db";
import { eq, and, asc, or } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth, createToken, type AuthRequest } from "../lib/auth";
import { StartSessionBody, FinishSessionParams } from "@workspace/api-zod";
import { generateClassReport } from "../lib/azure-openai";
import { getSessionById as getMongoSession } from "@workspace/mongo";
import { logger } from "../lib/logger";
import { generateAndStoreReportPdf } from "../lib/pdf";

const router: IRouter = Router();

// ── Ad-hoc Custom Class (writes to Supabase classes table) ─────────────────
const StartCustomSessionBody = z.object({
  studentName: z.string().min(1).max(120),
  subject: z.string().min(1).max(120),
  durationMinutes: z.number().int().min(5).max(240).optional(),
  grade: z.string().max(40).optional(),
  platform: z.enum(["zoom", "google_meet", "teams"]).optional(),
});

router.post("/sessions/start-custom", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const parsed = StartCustomSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  await finishActive(authReq);

  // Determine the best (teacherIdInt, wiseTeacherId) pair to write. We use
  // teachers.external_id (which mirrors the Wise teacher id) so that a teacher
  // logged in via either auth path produces records the OTHER path can find:
  //   • Wise login → wiseTeacherId from token, teacherIdInt from external_id match
  //   • Supabase login → teacherIdInt from token, wiseTeacherId from external_id
  let teacherIdInt: number | null = null;
  let wiseTeacherId: string | null = authReq.teacher.wiseTeacherId ?? null;
  if (authReq.teacher.wiseTeacherId) {
    const [match] = await db
      .select()
      .from(teachersTable)
      .where(eq(teachersTable.externalId, authReq.teacher.wiseTeacherId));
    teacherIdInt = match?.id ?? null;
  } else {
    teacherIdInt = authReq.teacher.id;
    const [match] = await db
      .select()
      .from(teachersTable)
      .where(eq(teachersTable.id, authReq.teacher.id));
    wiseTeacherId = match?.externalId ?? null;
  }

  const [cls] = await db
    .insert(classesTable)
    .values({
      teacherId: teacherIdInt ?? 1,
      studentName: parsed.data.studentName,
      subject: parsed.data.subject,
      scheduledAt: new Date(),
      durationMinutes: parsed.data.durationMinutes ?? 60,
      platform: parsed.data.platform ?? "zoom",
      status: "in_progress",
      grade: parsed.data.grade ?? null,
      notes: wiseTeacherId
        ? `Custom ad-hoc class — Wise teacher ${wiseTeacherId}`
        : "Custom ad-hoc class",
    })
    .returning();

  const [session] = await db
    .insert(sessionsTable)
    .values({
      classId: cls.id,
      teacherId: teacherIdInt,
      wiseTeacherId,
      status: "active",
    })
    .returning();

  res.status(201).json({
    session: {
      id: session.id,
      classId: session.classId,
      teacherId: session.teacherId,
      startedAt: session.startedAt.toISOString(),
      status: session.status,
    },
    class: {
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
    },
  });
});

// ── Start a session ─────────────────────────────────────────────────────
// Body accepts EITHER `classId: number` (legacy Supabase class) OR
// `wiseSessionId: string` / `classId: string` (Wise calendar session).
const StartFlexible = z.object({
  classId: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
  wiseSessionId: z.string().min(1).optional(),
});

router.post("/sessions/start", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const parsed = StartFlexible.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  // Resolve a target class identifier. Accept (in priority): explicit
  // wiseSessionId, classId-as-string, classId-as-int (legacy).
  const wiseId = parsed.data.wiseSessionId
    ?? (typeof parsed.data.classId === "string" ? parsed.data.classId : undefined);
  const legacyClassId = typeof parsed.data.classId === "number" ? parsed.data.classId : undefined;

  await finishActive(authReq);

  // ── Wise session path ──
  if (wiseId) {
    const wiseSession = await getMongoSession(wiseId);
    if (!wiseSession) {
      res.status(404).json({ error: "Wise session not found" });
      return;
    }
    const wiseTeacherId =
      (typeof wiseSession.userId === "object" && wiseSession.userId?._id) ||
      wiseSession.teacher_id ||
      authReq.teacher.wiseTeacherId ||
      null;
    const wiseClassId =
      (typeof wiseSession.classId === "object" && wiseSession.classId?._id) ||
      wiseSession.class_id ||
      null;

    // Also resolve the matching Supabase teacher (linked via external_id) so
    // admin queries that filter by either id flavor can find this session.
    let teacherIdInt: number | null = null;
    if (wiseTeacherId) {
      const [match] = await db
        .select()
        .from(teachersTable)
        .where(eq(teachersTable.externalId, wiseTeacherId));
      teacherIdInt = match?.id ?? null;
    }

    const [session] = await db
      .insert(sessionsTable)
      .values({
        wiseSessionId: wiseSession.session_id,
        wiseTeacherId,
        wiseClassId,
        teacherId: teacherIdInt,
        classId: null,
        status: "active",
      })
      .returning();

    res.status(201).json({
      id: session.id,
      classId: session.classId,
      teacherId: session.teacherId,
      wiseSessionId: session.wiseSessionId,
      wiseTeacherId: session.wiseTeacherId,
      wiseClassId: session.wiseClassId,
      startedAt: session.startedAt.toISOString(),
      status: session.status,
    });
    return;
  }

  // ── Legacy Supabase int classId path ──
  if (legacyClassId == null) {
    // Validate via the original schema so the error message matches the spec.
    const legacy = StartSessionBody.safeParse(req.body);
    if (!legacy.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    return;
  }
  await db.update(classesTable).set({ status: "in_progress" }).where(eq(classesTable.id, legacyClassId));
  const [session] = await db
    .insert(sessionsTable)
    .values({ classId: legacyClassId, teacherId: authReq.teacher.id, status: "active" })
    .returning();
  res.status(201).json({
    id: session.id,
    classId: session.classId,
    teacherId: session.teacherId,
    startedAt: session.startedAt.toISOString(),
    status: session.status,
  });
});

// ── Current active session ─────────────────────────────────────────────
router.get("/sessions/active", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;

  let session: typeof sessionsTable.$inferSelect | undefined;
  if (authReq.teacher.wiseTeacherId) {
    [session] = await db
      .select()
      .from(sessionsTable)
      .where(and(eq(sessionsTable.wiseTeacherId, authReq.teacher.wiseTeacherId), eq(sessionsTable.status, "active")));
  } else {
    [session] = await db
      .select()
      .from(sessionsTable)
      .where(and(eq(sessionsTable.teacherId, authReq.teacher.id), eq(sessionsTable.status, "active")));
  }

  if (!session) {
    res.json({ session: null, class: null });
    return;
  }

  let cls: typeof classesTable.$inferSelect | undefined;
  if (session.classId) {
    [cls] = await db.select().from(classesTable).where(eq(classesTable.id, session.classId));
  }

  // For Wise sessions, synthesize a Class-shaped object from the Wise lookup.
  let synthClass: {
    id: number | string;
    teacherId: number | string;
    studentName: string;
    subject: string;
    scheduledAt: string;
    durationMinutes: number;
    platform: string;
    meetingUrl: string | null;
    status: string;
    grade: string | null;
    notes: string | null;
  } | null = null;
  if (!cls && session.wiseSessionId) {
    const ws = await getMongoSession(session.wiseSessionId);
    if (ws) {
      const classObj = ws.classId && typeof ws.classId === "object" ? ws.classId : null;
      const start = new Date(ws.scheduledStartTime);
      const end = new Date(ws.scheduledEndTime);
      synthClass = {
        id: ws.session_id,
        teacherId: session.wiseTeacherId ?? "",
        studentName: classObj?.name ?? ws.class_name ?? "Student",
        subject: classObj?.subject ?? "Class",
        scheduledAt: start.toISOString(),
        durationMinutes: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000)),
        platform: "wise",
        meetingUrl: null,
        status: "in_progress",
        grade: null,
        notes: null,
      };
    }
  }

  res.json({
    session: {
      id: session.id,
      classId: session.classId,
      teacherId: session.teacherId,
      wiseSessionId: session.wiseSessionId,
      startedAt: session.startedAt.toISOString(),
      status: session.status,
    },
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
      : synthClass,
  });
});

// ── Finish session — generates AI report keyed by Wise IDs when applicable ──
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
    .where(
      and(
        eq(sessionsTable.id, params.data.sessionId),
        or(
          eq(sessionsTable.teacherId, authReq.teacher.id),
          authReq.teacher.wiseTeacherId
            ? eq(sessionsTable.wiseTeacherId, authReq.teacher.wiseTeacherId)
            : undefined,
        )!,
      ),
    );

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await db
    .update(sessionsTable)
    .set({ status: "finished", finishedAt: new Date() })
    .where(eq(sessionsTable.id, session.id));

  if (session.classId) {
    await db.update(classesTable).set({ status: "completed" }).where(eq(classesTable.id, session.classId));
  }

  // Resolve class metadata: Supabase first, then Wise fallback.
  let studentName = "Student";
  let subject = "Class";
  let durationMinutes: number | undefined = undefined;
  if (session.classId) {
    const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, session.classId));
    if (cls) {
      studentName = cls.studentName;
      subject = cls.subject;
      durationMinutes = cls.durationMinutes;
    }
  } else if (session.wiseSessionId) {
    const ws = await getMongoSession(session.wiseSessionId);
    if (ws) {
      const classObj = ws.classId && typeof ws.classId === "object" ? ws.classId : null;
      studentName = classObj?.name ?? ws.class_name ?? studentName;
      subject = classObj?.subject ?? subject;
      const start = new Date(ws.scheduledStartTime);
      const end = new Date(ws.scheduledEndTime);
      durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
    }
  }

  // Pull captured transcript (matches by either int session id or Wise id).
  const utterances = session.wiseSessionId
    ? await db
        .select()
        .from(transcriptsTable)
        .where(eq(transcriptsTable.wiseSessionId, session.wiseSessionId))
        .orderBy(asc(transcriptsTable.capturedAt))
    : await db
        .select()
        .from(transcriptsTable)
        .where(eq(transcriptsTable.sessionId, session.id))
        .orderBy(asc(transcriptsTable.capturedAt));
  const transcript = utterances.map((u) => `${u.speaker}: ${u.text}`).join("\n");

  const reportData = await generateClassReport({
    studentName,
    subject,
    teacherName: authReq.teacher.name,
    transcript,
    durationMinutes,
  });

  const [report] = await db
    .insert(reportsTable)
    .values({
      sessionId: session.id,
      classId: session.classId,
      teacherId: session.teacherId,
      wiseSessionId: session.wiseSessionId ?? null,
      wiseTeacherId: session.wiseTeacherId ?? null,
      wiseClassId: session.wiseClassId ?? null,
      ...reportData,
    })
    .returning();

  res.json({
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
    class: session.classId
      ? null // legacy path filled above; left null to avoid double-fetch
      : { studentName, subject, durationMinutes: durationMinutes ?? 60 },
  });

  // Fire-and-forget PDF render so the URL is ready by the time the teacher
  // clicks "Send to my email." Failures are logged, not surfaced — render
  // can be retried by hitting POST /reports/:id/pdf. We mint a fresh token
  // for the requester so the Playwright browser can fetch the report from
  // /api/reports/:id under their identity.
  const renderToken = authReq.teacher.wiseTeacherId
    ? createToken({ role: authReq.role, wiseTeacherId: authReq.teacher.wiseTeacherId })
    : createToken({ role: authReq.role, teacherId: authReq.teacher.id });
  setImmediate(() => {
    generateAndStoreReportPdf(report.id, { authToken: renderToken })
      .then((pdfUrl) =>
        db.update(reportsTable).set({ pdfUrl }).where(eq(reportsTable.id, report.id)),
      )
      .catch((err) => {
        logger.error({ err, reportId: report.id }, "Background PDF render failed");
      });
  });
});

async function finishActive(authReq: AuthRequest): Promise<void> {
  if (authReq.teacher.wiseTeacherId) {
    await db
      .update(sessionsTable)
      .set({ status: "finished", finishedAt: new Date() })
      .where(and(eq(sessionsTable.wiseTeacherId, authReq.teacher.wiseTeacherId), eq(sessionsTable.status, "active")));
  } else {
    await db
      .update(sessionsTable)
      .set({ status: "finished", finishedAt: new Date() })
      .where(and(eq(sessionsTable.teacherId, authReq.teacher.id), eq(sessionsTable.status, "active")));
  }
}

export default router;
