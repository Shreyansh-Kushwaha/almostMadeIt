import { Router, type IRouter } from "express";
import { db, classesTable } from "@workspace/db";
import { eq, and, ilike, asc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { GetClassParams } from "@workspace/api-zod";

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
  const status =
    typeof req.query.status === "string" && ALLOWED_STATUSES.has(req.query.status)
      ? req.query.status
      : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

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

router.get("/classes/:classId", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const rawId = Array.isArray(req.params.classId) ? req.params.classId[0] : req.params.classId;
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
