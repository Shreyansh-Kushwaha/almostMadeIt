import { Router, type IRouter } from "express";
import { db, studentsTable, classesTable, reportsTable, parentReportsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { generateParentReport } from "../lib/azure-openai";

const router: IRouter = Router();

router.get("/students/:studentId/parent-report", requireAuth, async (req, res): Promise<void> => {
  const studentId = parseInt(String(req.params.studentId), 10);
  if (!Number.isFinite(studentId)) {
    res.status(400).json({ error: "Invalid student ID" });
    return;
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  // Reuse a recent stored report if it's less than 24h old
  const [recent] = await db
    .select()
    .from(parentReportsTable)
    .where(eq(parentReportsTable.studentId, studentId))
    .orderBy(desc(parentReportsTable.createdAt));
  if (recent && Date.now() - recent.createdAt.getTime() < 24 * 60 * 60 * 1000) {
    res.json({
      id: recent.id,
      studentId: recent.studentId,
      periodStart: recent.periodStart.toISOString(),
      periodEnd: recent.periodEnd.toISOString(),
      engagementScore: recent.engagementScore,
      understandingScore: recent.understandingScore,
      confidenceScore: recent.confidenceScore,
      summary: recent.summary,
      strengths: recent.strengths,
      weakAreas: recent.weakAreas,
      recommendations: recent.recommendations,
      createdAt: recent.createdAt.toISOString(),
    });
    return;
  }

  // Otherwise generate fresh from the student's recent reports
  const cls = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.studentId, studentId));
  const classIds = cls.map((c) => c.id);
  const reportsForStudent: (typeof reportsTable.$inferSelect)[] = [];
  for (const cid of classIds) {
    const rs = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.classId, cid))
      .orderBy(desc(reportsTable.createdAt));
    reportsForStudent.push(...rs);
  }
  const window = reportsForStudent.slice(0, 5);

  const ai = await generateParentReport({
    studentName: student.name,
    periodLabel: "the past two weeks",
    recentReports: window.map((r) => ({
      engagement: r.engagementScore,
      understanding: r.understandingScore ?? 75,
      satisfaction: r.satisfactionScore ?? 75,
      subject: cls.find((c) => c.id === r.classId)?.subject ?? "class",
    })),
  });

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 14 * 24 * 60 * 60 * 1000);
  const [stored] = await db
    .insert(parentReportsTable)
    .values({
      studentId,
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

  res.json({
    id: stored.id,
    studentId: stored.studentId,
    periodStart: stored.periodStart.toISOString(),
    periodEnd: stored.periodEnd.toISOString(),
    engagementScore: stored.engagementScore,
    understandingScore: stored.understandingScore,
    confidenceScore: stored.confidenceScore,
    summary: stored.summary,
    strengths: stored.strengths,
    weakAreas: stored.weakAreas,
    recommendations: stored.recommendations,
    createdAt: stored.createdAt.toISOString(),
  });
});

export default router;
