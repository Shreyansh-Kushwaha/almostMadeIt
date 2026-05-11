import { Router, type IRouter } from "express";
import { db, classesTable } from "@workspace/db";
import { eq, and, ilike, asc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { GetClassParams } from "@workspace/api-zod";
import { listSessions as listMongoSessions, getSessionById as getMongoSession } from "@workspace/mongo";

const router: IRouter = Router();

const ALLOWED_STATUSES = new Set(["upcoming", "completed", "cancelled", "active"]);

router.get("/classes", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;

  const rawLimit = parseInt(String(req.query.limit ?? "12"), 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 100)
    : 12;
  const rawPage = parseInt(String(req.query.page ?? "1"), 10);
  const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;
  const rawStatus = typeof req.query.status === "string" ? req.query.status : "";
  const status = ALLOWED_STATUSES.has(rawStatus) ? rawStatus : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  // ── Wise (Mongo) teacher → read from wise_course_sessions ──
  if (authReq.teacher.wiseTeacherId) {
    // Map our UI status terms onto Wise's meetingStatus values.
    // Wise uses: UPCOMING, ENDED (=completed), CANCELLED, MISSED,
    // NOT_STARTED, IN_PROGRESS. Display buckets us into 4 simpler values.
    const wiseStatus =
      status === "upcoming" ? "UPCOMING"
      : status === "completed" ? "ENDED"
      : status === "cancelled" ? "CANCELLED"
      : status === "active" ? "IN_PROGRESS"
      : undefined;
    const out = await listMongoSessions({
      teacherId: authReq.teacher.wiseTeacherId,
      status: wiseStatus,
      search: q || undefined,
      page,
      limit,
    });
    res.json({
      items: out.items.map(formatWiseSession),
      total: out.total,
      page: out.page,
      limit: out.limit,
      hasMore: out.hasMore,
    });
    return;
  }

  // ── Legacy Supabase teacher → use existing classes table ──
  const conditions = [eq(classesTable.teacherId, authReq.teacher.id)];
  if (status) conditions.push(eq(classesTable.status, status));
  if (q) conditions.push(ilike(classesTable.studentName, `%${q}%`));
  const where = and(...conditions);

  const [{ value: total }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(classesTable)
    .where(where);

  const rows = await db
    .select()
    .from(classesTable)
    .where(where)
    .orderBy(asc(classesTable.scheduledAt))
    .limit(limit)
    .offset((page - 1) * limit);

  res.json({
    items: rows.map(formatClass),
    total,
    page,
    limit,
    hasMore: page * limit < total,
  });
});

// Map a Wise course session document to our Class shape so the frontend
// doesn't need to know which source the data came from.
function formatWiseSession(s: {
  session_id: string;
  meetingStatus: string;
  title: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  classId: { _id: string; name?: string; subject?: string } | string | null;
  userId: { _id: string; name: string } | string | null;
  teacher_id?: string;
  teacher_name?: string;
  class_id?: string;
  class_name?: string;
  students?: Array<{ _id: string; name?: string }>;
  // Stashed by enrichSessionsWithClassroom — see lib/mongo/src/services.ts.
  __parsed?: { yearLevel: string | null; subjectCode: string | null; country: string | null };
}): {
  id: string;
  teacherId: string;
  studentName: string;
  subject: string;
  scheduledAt: string;
  durationMinutes: number;
  platform: string;
  meetingUrl: string | null;
  status: string;
  grade: string | null;
  notes: string | null;
} {
  const start = new Date(s.scheduledStartTime);
  const end = new Date(s.scheduledEndTime);
  const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
  const classObj = (s.classId && typeof s.classId === "object" ? s.classId : null) ?? null;
  const className = classObj?.name ?? s.class_name ?? "";
  const subjectRaw = classObj?.subject ?? "";
  // Wise classrooms are 1:1 and the classroom NAME equals the student's name
  // (e.g. "Jerusha"). The classroom SUBJECT is an encoded code like
  // "UK-6038-Jerusha-0226-Public Speaking-4" — slice out the human-readable
  // subject portion (penultimate field after splitting by '-').
  const studentName = className || s.students?.[0]?.name || "Student";
  // Prefer the authoritative parsed subject/grade from wise_classroom_parsed
  // (populated by enrichSessionsWithClassroom). Falls back to a best-effort
  // split of the raw subject code when the parsed doc is missing.
  const parsedSubject = s.__parsed?.subjectCode ?? null;
  const parsedGrade = s.__parsed?.yearLevel ?? null;
  const subjectParts = subjectRaw.split("-");
  const fallbackSubject = subjectParts.length >= 6
    ? subjectParts.slice(4, -1).join("-").trim()
    : subjectRaw;
  const fallbackGrade = subjectParts.length >= 6 ? subjectParts[subjectParts.length - 1].trim() : null;
  const prettySubject = parsedSubject || fallbackSubject;
  const grade = parsedGrade ?? fallbackGrade ?? null;
  const teacherIdStr = (s.userId && typeof s.userId === "object" ? s.userId._id : s.teacher_id) ?? "";
  return {
    id: s.session_id,
    teacherId: teacherIdStr,
    studentName,
    subject: prettySubject || subjectRaw || "Class",
    scheduledAt: start.toISOString(),
    durationMinutes,
    platform: "wise",
    meetingUrl: null,
    status:
      s.meetingStatus === "UPCOMING" || s.meetingStatus === "NOT_STARTED" ? "upcoming"
      : s.meetingStatus === "ENDED" ? "completed"
      : s.meetingStatus === "CANCELLED" || s.meetingStatus === "MISSED" ? "cancelled"
      : s.meetingStatus === "IN_PROGRESS" ? "active"
      : "upcoming",
    grade,
    notes: null,
  };
}

router.get("/classes/:classId", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const rawId = String(
    Array.isArray(req.params.classId) ? req.params.classId[0] : req.params.classId,
  );

  // Mongo Wise session ID (24-char hex)
  if (/^[a-fA-F0-9]{24}$/.test(rawId)) {
    const s = await getMongoSession(rawId);
    if (!s) {
      res.status(404).json({ error: "Class not found" });
      return;
    }
    res.json(formatWiseSession(s));
    return;
  }

  const params = GetClassParams.safeParse({ classId: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid class ID" });
    return;
  }
  const [cls] = await db
    .select()
    .from(classesTable)
    .where(and(eq(classesTable.id, params.data.classId), eq(classesTable.teacherId, authReq.teacher.id)));
  if (!cls) {
    res.status(404).json({ error: "Class not found" });
    return;
  }
  res.json(formatClass(cls));
});

function formatClass(cls: typeof classesTable.$inferSelect) {
  return {
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
  };
}

export default router;
