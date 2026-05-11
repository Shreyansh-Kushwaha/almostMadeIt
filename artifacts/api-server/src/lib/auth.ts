import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { type Request, type Response, type NextFunction } from "express";
import { db, teachersTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getTeacherById as getMongoTeacher, getStudentById as getMongoStudent } from "@workspace/mongo";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set in production — refusing to start with the hardcoded fallback (tokens would be forgeable).");
}
const SECRET = process.env.SESSION_SECRET ?? "super-sheldon-secret-key";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "supersheldon";

export type Role = "teacher" | "admin" | "student";

// Token now supports Mongo string IDs (Wise IDs). Legacy int teacherId is
// retained as a backwards-compat fallback for old tokens / admin tokens
// that don't yet have a Mongo-backed identity.
interface TokenPayload {
  role?: Role;
  // New: Mongo string IDs (Wise upstream)
  wiseTeacherId?: string;
  wiseStudentId?: string;
  // Legacy: Supabase int IDs (still used by admin token + old tokens)
  teacherId?: number;
  studentId?: number;
  iat: number;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHmac("sha256", SECRET).update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  const hash = createHmac("sha256", SECRET).update(password + salt).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

export function createToken(idOrPayload: number | Omit<TokenPayload, "iat">): string {
  const payload: TokenPayload = typeof idOrPayload === "number"
    ? { role: "teacher", teacherId: idOrPayload, iat: Date.now() }
    : { ...idOrPayload, iat: Date.now() };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString());
  } catch {
    return null;
  }
}

// The "teacher" shape used by requireAuth.teacher. Originated from the Supabase
// row; we now also produce this shape from Mongo wise_teachers docs so existing
// routes keep working. `wiseTeacherId` is the Mongo string ID; `id` is 0 for
// Mongo-backed teachers (no Supabase row exists for them).
export interface TeacherIdentity {
  id: number;                       // 0 for Mongo-backed, real int for Supabase-backed
  wiseTeacherId: string | null;     // Mongo ID when sourced from Wise
  name: string;
  email: string;
  subject: string;
  avatarUrl: string | null;
  totalClasses: number;
  avgScore: number;
}

export interface StudentIdentity {
  id: number;                       // 0 for Mongo-backed
  wiseStudentId: string | null;     // Mongo ID when sourced from Wise
  name: string;
  email: string | null;
  subject: string | null;
  grade: string | null;
  avatarUrl: string | null;
  primaryTeacherId: number | null;
}

export type AuthRequest = Request & {
  teacher: TeacherIdentity;
  role: Role;
  student?: StudentIdentity;
};

function fromSupabaseTeacher(t: typeof teachersTable.$inferSelect): TeacherIdentity {
  return {
    id: t.id,
    wiseTeacherId: null,
    name: t.name,
    email: t.email,
    subject: t.subject,
    avatarUrl: t.avatarUrl,
    totalClasses: t.totalClasses,
    avgScore: t.avgScore,
  };
}

function fromMongoTeacher(t: { wise_teacher_id: string; name: string | null; email: string | null; classes?: string[] }): TeacherIdentity {
  return {
    id: 0,
    wiseTeacherId: t.wise_teacher_id,
    name: t.name ?? "Teacher",
    email: t.email ?? "",
    subject: "Multiple",
    avatarUrl: null,
    totalClasses: t.classes?.length ?? 0,
    avgScore: 0,
  };
}

function fromSupabaseStudent(s: typeof studentsTable.$inferSelect): StudentIdentity {
  return {
    id: s.id,
    wiseStudentId: null,
    name: s.name,
    email: s.email,
    subject: s.subject,
    grade: s.grade,
    avatarUrl: s.avatarUrl,
    primaryTeacherId: s.primaryTeacherId,
  };
}

function fromMongoStudent(s: { wise_student_id: string; name: string | null; email: string | null }): StudentIdentity {
  return {
    id: 0,
    wiseStudentId: s.wise_student_id,
    name: s.name ?? "Student",
    email: s.email,
    subject: null,
    grade: null,
    avatarUrl: null,
    primaryTeacherId: null,
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  const role: Role = payload.role ?? "teacher";

  // ── Student tokens ─────────────────────────────────────────────────────
  if (role === "student") {
    if (payload.wiseStudentId) {
      const s = await getMongoStudent(payload.wiseStudentId);
      if (!s) {
        res.status(401).json({ error: "Student not found in Wise" });
        return;
      }
      const authReq = req as AuthRequest;
      authReq.student = fromMongoStudent(s);
      authReq.role = "student";
      // Backing teacher synthesized — student routes don't actually use it.
      authReq.teacher = {
        id: 0, wiseTeacherId: null, name: "—", email: "",
        subject: "", avatarUrl: null, totalClasses: 0, avgScore: 0,
      };
      next();
      return;
    }
    // Legacy: Supabase student row
    if (payload.studentId) {
      const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, payload.studentId));
      if (!student) {
        res.status(401).json({ error: "Student not found" });
        return;
      }
      const backingTeacherId = student.primaryTeacherId ?? 1;
      const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, backingTeacherId));
      const authReq = req as AuthRequest;
      authReq.student = fromSupabaseStudent(student);
      authReq.role = "student";
      authReq.teacher = teacher ? fromSupabaseTeacher(teacher) : {
        id: 0, wiseTeacherId: null, name: "—", email: "",
        subject: "", avatarUrl: null, totalClasses: 0, avgScore: 0,
      };
      next();
      return;
    }
    res.status(401).json({ error: "Invalid student token" });
    return;
  }

  // ── Teacher / Admin tokens ─────────────────────────────────────────────
  if (payload.wiseTeacherId) {
    const t = await getMongoTeacher(payload.wiseTeacherId);
    if (!t) {
      res.status(401).json({ error: "Teacher not found in Wise" });
      return;
    }
    const authReq = req as AuthRequest;
    authReq.teacher = fromMongoTeacher(t);
    authReq.role = role;
    next();
    return;
  }

  // Legacy / admin: Supabase teacher row by int id
  const teacherId = payload.teacherId ?? 1;
  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, teacherId));
  if (!teacher) {
    res.status(401).json({ error: "Teacher not found" });
    return;
  }
  const authReq = req as AuthRequest;
  authReq.teacher = fromSupabaseTeacher(teacher);
  authReq.role = role;
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const r = (req as AuthRequest).role;
    if (!roles.includes(r)) {
      res.status(403).json({ error: "Forbidden for this role" });
      return;
    }
    next();
  };
}
