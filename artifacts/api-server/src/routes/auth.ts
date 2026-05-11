import { Router, type IRouter } from "express";
import { db, teachersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { hashPassword, verifyPassword, createToken, requireAuth, type AuthRequest } from "../lib/auth";
import { LoginBody } from "@workspace/api-zod";
import { z } from "zod/v4";

const router: IRouter = Router();

// Public — list teachers for the picker screen (no password flow).
router.get("/teachers/select", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(teachersTable)
    .orderBy(asc(teachersTable.name));
  res.json(
    rows.map((t) => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      avatarUrl: t.avatarUrl,
      totalClasses: t.totalClasses,
    }))
  );
});

// Public — issue an auth token by teacher id (no password required).
const SelectTeacherBody = z.object({ teacherId: z.number().int().positive() });
router.post("/auth/select-teacher", async (req, res): Promise<void> => {
  const parsed = SelectTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [teacher] = await db
    .select()
    .from(teachersTable)
    .where(eq(teachersTable.id, parsed.data.teacherId));
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  const token = createToken(teacher.id);
  res.json({
    token,
    teacher: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      subject: teacher.subject,
      avatarUrl: teacher.avatarUrl,
      totalClasses: teacher.totalClasses,
      avgScore: teacher.avgScore,
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { email, password } = parsed.data;
  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.email, email));
  if (!teacher || !verifyPassword(password, teacher.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = createToken(teacher.id);
  res.json({
    token,
    teacher: {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      subject: teacher.subject,
      avatarUrl: teacher.avatarUrl,
      totalClasses: teacher.totalClasses,
      avgScore: teacher.avgScore,
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const t = authReq.teacher;
  res.json({
    id: t.id,
    name: t.name,
    email: t.email,
    subject: t.subject,
    avatarUrl: t.avatarUrl,
    totalClasses: t.totalClasses,
    avgScore: t.avgScore,
  });
});

const UpdateMeBody = z.object({
  name: z.string().min(1).max(120).optional(),
  subject: z.string().min(1).max(120).optional(),
  avatarUrl: z.string().nullable().optional(),
});

router.patch("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.subject !== undefined) updates.subject = parsed.data.subject;
  if (parsed.data.avatarUrl !== undefined) updates.avatarUrl = parsed.data.avatarUrl;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No updatable fields supplied" });
    return;
  }
  await db.update(teachersTable).set(updates).where(eq(teachersTable.id, authReq.teacher.id));
  const [t] = await db.select().from(teachersTable).where(eq(teachersTable.id, authReq.teacher.id));
  res.json({
    id: t.id,
    name: t.name,
    email: t.email,
    subject: t.subject,
    avatarUrl: t.avatarUrl,
    totalClasses: t.totalClasses,
    avgScore: t.avgScore,
  });
});

router.post("/auth/logout", (_req, res): Promise<void> => {
  res.json({ message: "Logged out successfully" });
  return Promise.resolve();
});

export default router;
