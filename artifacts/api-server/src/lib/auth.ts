import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { type Request, type Response, type NextFunction } from "express";
import { db, teachersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set in production — refusing to start with the hardcoded fallback (tokens would be forgeable).");
}
const SECRET = process.env.SESSION_SECRET ?? "super-sheldon-secret-key";

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

export function createToken(teacherId: number): string {
  const payload = JSON.stringify({ teacherId, iat: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyToken(token: string): { teacherId: number } | null {
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
  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, payload.teacherId));
  if (!teacher) {
    res.status(401).json({ error: "Teacher not found" });
    return;
  }
  (req as Request & { teacher: typeof teacher }).teacher = teacher;
  next();
}

export type AuthRequest = Request & { teacher: { id: number; name: string; email: string; subject: string; avatarUrl: string | null; totalClasses: number; avgScore: number } };
