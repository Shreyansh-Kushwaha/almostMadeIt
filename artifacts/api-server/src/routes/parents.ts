import { Router, type IRouter } from "express";
import { db, studentsTable, classesTable, reportsTable, parentReportsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { generateParentReport } from "../lib/azure-openai";
import { getStudentById as getMongoStudent } from "@workspace/mongo";

const router: IRouter = Router();

interface ParentReportShape {
  id: number | string;
  studentId: number | string;
  periodStart: string;
  periodEnd: string;
  engagementScore: number;
  understandingScore: number;
  confidenceScore: number;
  summary: string;
  strengths: string[];
  weakAreas: string[];
  recommendations: string[];
  createdAt: string;
}

function shape(r: typeof parentReportsTable.$inferSelect): ParentReportShape {
  return {
    id: r.id,
    studentId: r.wiseStudentId ?? r.studentId ?? 0,
    periodStart: r.periodStart.toISOString(),
    periodEnd: r.periodEnd.toISOString(),
    engagementScore: r.engagementScore,
    understandingScore: r.understandingScore,
    confidenceScore: r.confidenceScore,
    summary: r.summary,
    strengths: r.strengths,
    weakAreas: r.weakAreas,
    recommendations: r.recommendations,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/students/:studentId/parent-report", requireAuth, async (req, res): Promise<void> => {
  const rawId = String(req.params.studentId);
  const isWiseId = /^[a-fA-F0-9]{24}$/.test(rawId);

  let studentName: string | null = null;
  let wiseStudentId: string | null = null;
  let supabaseStudentId: number | null = null;
  let reportsForStudent: (typeof reportsTable.$inferSelect)[] = [];
  let classSubjects = new Map<string | number, string>();

  if (isWiseId) {
    // ── Wise student path ──
    const ws = await getMongoStudent(rawId);
    if (!ws) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    studentName = ws.name ?? "Student";
    wiseStudentId = ws.wise_student_id;

    // Pull ClassPulse reports we've already generated for this Wise student.
    reportsForStudent = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.wiseStudentId, wiseStudentId))
      .orderBy(desc(reportsTable.createdAt));
    // For subject context, derive from the report's wise_class_id where possible.
    for (const r of reportsForStudent) {
      if (r.wiseClassId) classSubjects.set(r.wiseClassId, ws.subject ?? "class");
    }
  } else {
    // ── Legacy Supabase student path ──
    const sid = parseInt(rawId, 10);
    if (!Number.isFinite(sid)) {
      res.status(400).json({ error: "Invalid student ID" });
      return;
    }
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, sid));
    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    studentName = student.name;
    supabaseStudentId = student.id;

    const cls = await db.select().from(classesTable).where(eq(classesTable.studentId, sid));
    const classIds = cls.map((c) => c.id);
    for (const c of cls) classSubjects.set(c.id, c.subject);
    for (const cid of classIds) {
      const rs = await db
        .select()
        .from(reportsTable)
        .where(eq(reportsTable.classId, cid))
        .orderBy(desc(reportsTable.createdAt));
      reportsForStudent.push(...rs);
    }
  }

  // Reuse a recent stored parent report (under 24h) if it exists.
  const recentRows = isWiseId
    ? await db
        .select()
        .from(parentReportsTable)
        .where(eq(parentReportsTable.wiseStudentId, wiseStudentId!))
        .orderBy(desc(parentReportsTable.createdAt))
    : await db
        .select()
        .from(parentReportsTable)
        .where(eq(parentReportsTable.studentId, supabaseStudentId!))
        .orderBy(desc(parentReportsTable.createdAt));
  const recent = recentRows[0];
  if (recent && Date.now() - recent.createdAt.getTime() < 24 * 60 * 60 * 1000) {
    res.json(shape(recent));
    return;
  }

  // Otherwise generate fresh from the student's most recent ClassPulse reports.
  const window = reportsForStudent.slice(0, 5);
  const ai = await generateParentReport({
    studentName: studentName ?? "Student",
    periodLabel: "the past two weeks",
    recentReports: window.map((r) => ({
      engagement: r.engagementScore,
      understanding: r.understandingScore ?? 75,
      satisfaction: r.satisfactionScore ?? 75,
      subject:
        (r.wiseClassId ? classSubjects.get(r.wiseClassId) : null) ??
        (r.classId != null ? classSubjects.get(r.classId) : null) ??
        "class",
    })),
  });

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 14 * 24 * 60 * 60 * 1000);
  const [stored] = await db
    .insert(parentReportsTable)
    .values({
      studentId: supabaseStudentId,
      wiseStudentId,
      periodStart,
      periodEnd,
      engagementScore: ai.engagementScore,
      understandingScore: ai.understandingScore,
      confidenceScore: ai.confidenceScore,
      summary: ai.summary,
      strengths: ai.strengths,
      weakAreas: ai.weakAreas,
      recommendations: ai.recommendations,
    })
    .returning();

  res.json(shape(stored));
});

export default router;
