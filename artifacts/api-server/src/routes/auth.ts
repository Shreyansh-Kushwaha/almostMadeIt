import { Router, type IRouter } from "express";
import { db, teachersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, createToken, requireAuth, type AuthRequest } from "../lib/auth";
import { LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

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

router.post("/auth/logout", (_req, res): Promise<void> => {
  res.json({ message: "Logged out successfully" });
  return Promise.resolve();
});

export default router;
