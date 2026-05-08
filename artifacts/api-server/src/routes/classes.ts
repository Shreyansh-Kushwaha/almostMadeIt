import { Router, type IRouter } from "express";
import { db, classesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { GetClassParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/classes", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const classes = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.teacherId, authReq.teacher.id))
    .orderBy(classesTable.scheduledAt);
  res.json(classes.map(formatClass));
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
