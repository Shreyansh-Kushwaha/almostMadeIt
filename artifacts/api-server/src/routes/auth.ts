import { Router, type IRouter } from "express";
import { db, teachersTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  hashPassword, verifyPassword, createToken, requireAuth,
  type AuthRequest, ADMIN_PASSWORD,
} from "../lib/auth";
import { LoginBody } from "@workspace/api-zod";
import { z } from "zod/v4";
import {
  listTeachers as listMongoTeachers,
  getTeacherById as getMongoTeacher,
  listStudents as listMongoStudents,
  getStudentById as getMongoStudent,
} from "@workspace/mongo";

const router: IRouter = Router();

// ── Picker — teachers (reads from Wise via Mongo) ──────────────────────────
router.get("/teachers/select", async (_req, res): Promise<void> => {
  const rows = await listMongoTeachers({ limit: 2000 });
  res.json(
    rows.map((t) => ({
      id: t.wise_teacher_id,                 // string — Mongo Wise ID
      name: t.name ?? "Teacher",
      subject: "Multiple",                    // Wise doesn't expose a single subject per teacher
      avatarUrl: null,
      totalClasses: t.classes?.length ?? 0,
      email: t.email ?? "",
    }))
  );
});

// ── Picker — students (reads from Wise via Mongo) ──────────────────────────
router.get("/students/public-list", async (_req, res): Promise<void> => {
  const rows = await listMongoStudents({ limit: 5000 });
  res.json(
    rows.map((s) => ({
      id: s.wise_student_id,
      name: s.name ?? "Student",
      subject: s.subject,
      grade: s.grade,
      email: s.email,
      avatarUrl: null,
    }))
  );
});

// ── Select teacher (no password) — issues Mongo-backed token ───────────────
const SelectTeacherBody = z.object({
  // Accept either a Mongo string ID (new) or a Supabase int (legacy)
  teacherId: z.union([z.string().min(1), z.number().int().positive()]),
});
router.post("/auth/select-teacher", async (req, res): Promise<void> => {
  const parsed = SelectTeacherBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const id = parsed.data.teacherId;

  // String ID → Mongo Wise lookup
  if (typeof id === "string") {
    const t = await getMongoTeacher(id);
    if (!t) {
      res.status(404).json({ error: "Teacher not found in Wise" });
      return;
    }
    const token = createToken({ role: "teacher", wiseTeacherId: t.wise_teacher_id });
    res.json({
      token,
      role: "teacher",
      teacher: {
        id: t.wise_teacher_id,
        name: t.name ?? "Teacher",
        email: t.email ?? "",
        subject: "Multiple",
        avatarUrl: null,
        totalClasses: t.classes?.length ?? 0,
        avgScore: 0,
      },
    });
    return;
  }

  // Legacy int — Supabase fallback (kept so admin/demo flows still work)
  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, id));
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  const token = createToken({ role: "teacher", teacherId: teacher.id });
  res.json({
    token,
    role: "teacher",
    teacher: {
      id: teacher.id, name: teacher.name, email: teacher.email,
      subject: teacher.subject, avatarUrl: teacher.avatarUrl,
      totalClasses: teacher.totalClasses, avgScore: teacher.avgScore,
    },
  });
});

// ── Select student — issues Mongo-backed student token ────────────────────
const SelectStudentBody = z.object({
  studentId: z.union([z.string().min(1), z.number().int().positive()]),
});
router.post("/auth/select-student", async (req, res): Promise<void> => {
  const parsed = SelectStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const id = parsed.data.studentId;

  if (typeof id === "string") {
    const s = await getMongoStudent(id);
    if (!s) {
      res.status(404).json({ error: "Student not found in Wise" });
      return;
    }
    const token = createToken({ role: "student", wiseStudentId: s.wise_student_id });
    res.json({
      token,
      role: "student",
      student: {
        id: s.wise_student_id, name: s.name ?? "Student",
        email: s.email, subject: null, grade: null, avatarUrl: null,
      },
    });
    return;
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  const token = createToken({ role: "student", studentId: student.id });
  res.json({
    token,
    role: "student",
    student: {
      id: student.id, name: student.name, email: student.email,
      subject: student.subject, grade: student.grade, avatarUrl: student.avatarUrl,
    },
  });
});

// ── Admin login ───────────────────────────────────────────────────────────
const AdminLoginBody = z.object({ password: z.string().min(1) });
router.post("/auth/admin-login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  if (parsed.data.password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid admin password" });
    return;
  }
  // Admin token uses legacy int teacherId=1 backing so all Supabase routes
  // keep working — admin sees Supabase-derived stuff alongside Mongo.
  const [backing] = await db.select().from(teachersTable).where(eq(teachersTable.id, 1));
  const token = createToken({ role: "admin", teacherId: backing?.id ?? 1 });
  res.json({
    token, role: "admin",
    admin: { name: "Admin", email: "admin@classpulse.ai" },
  });
});

// ── Legacy email/password login (still supported) ─────────────────────────
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
  const token = createToken({ role: "teacher", teacherId: teacher.id });
  res.json({
    token,
    teacher: {
      id: teacher.id, name: teacher.name, email: teacher.email,
      subject: teacher.subject, avatarUrl: teacher.avatarUrl,
      totalClasses: teacher.totalClasses, avgScore: teacher.avgScore,
    },
  });
});

// ── /auth/me — unified across all roles ───────────────────────────────────
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  if (authReq.role === "student" && authReq.student) {
    const s = authReq.student;
    res.json({
      role: "student",
      id: String(s.wiseStudentId ?? s.id),
      name: s.name,
      email: s.email ?? "",
      subject: s.subject ?? "",
      grade: s.grade ?? null,
      avatarUrl: s.avatarUrl,
      primaryTeacherId: s.primaryTeacherId,
      totalClasses: 0, avgScore: 0,
    });
    return;
  }
  const t = authReq.teacher;
  res.json({
    role: authReq.role,
    id: String(authReq.role === "admin" ? "admin" : (t.wiseTeacherId ?? t.id)),
    name: authReq.role === "admin" ? "Admin" : t.name,
    email: authReq.role === "admin" ? "admin@classpulse.ai" : t.email,
    subject: authReq.role === "admin" ? "Internal Team" : t.subject,
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
  // Mongo-backed identities are read-only per spec — only Supabase teachers
  // can edit their profile here.
  if (authReq.teacher.wiseTeacherId) {
    res.status(403).json({ error: "Wise-sourced teachers can't edit profile here" });
    return;
  }
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
    id: t.id, name: t.name, email: t.email,
    subject: t.subject, avatarUrl: t.avatarUrl,
    totalClasses: t.totalClasses, avgScore: t.avgScore,
  });
});

router.post("/auth/logout", (_req, res): Promise<void> => {
  res.json({ message: "Logged out successfully" });
  return Promise.resolve();
});

export default router;
