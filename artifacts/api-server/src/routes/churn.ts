import { Router, type IRouter } from "express";
import {
  db,
  studentsTable,
  classesTable,
  reportsTable,
  churnPredictionsTable,
  sessionsTable,
} from "@workspace/db";
import { eq, desc, and, gte } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { predictChurn } from "../lib/azure-openai";
import { getStudentById as getMongoStudent } from "@workspace/mongo";

const router: IRouter = Router();

async function computeAndStoreChurn(studentId: string | number) {
  const sid = typeof studentId === "string" ? parseInt(studentId, 10) : studentId;
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, sid));
  if (!student) return null;

  const cls = await db.select().from(classesTable).where(eq(classesTable.studentId, sid));
  const classIds = cls.map((c) => c.id);
  const recentScores: { engagement: number; understanding?: number; satisfaction?: number }[] = [];
  for (const cid of classIds) {
    const rs = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.classId, cid))
      .orderBy(desc(reportsTable.createdAt));
    for (const r of rs.slice(0, 3)) {
      recentScores.push({
        engagement: r.engagementScore,
        understanding: r.understandingScore ?? undefined,
        satisfaction: r.satisfactionScore ?? undefined,
      });
    }
  }

  // Simple attendance proxy: completed sessions / scheduled classes in last 30d
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentClasses = cls.filter((c) => c.scheduledAt >= since);
  const completed = recentClasses.filter((c) => c.status === "completed").length;
  const attendanceRate = recentClasses.length ? completed / recentClasses.length : 1;
  const cancellations30d = recentClasses.filter((c) => c.status === "cancelled").length;

  const prediction = await predictChurn({
    studentName: student.name,
    recentScores,
    attendanceRate,
    cancellations30d,
  });

  const [stored] = await db
    .insert(churnPredictionsTable)
    .values({
      studentId: sid,
      riskScore: prediction.riskScore,
      reasons: prediction.reasons,
      signals: prediction.signals,
    })
    .returning();
  return stored;
}

router.get("/students/:studentId/churn", requireAuth, async (req, res): Promise<void> => {
  const rawId = String(req.params.studentId);
  const isWiseId = /^[a-fA-F0-9]{24}$/.test(rawId);

  // ── Wise student path — read latest cached churn keyed by wise_student_id ──
  if (isWiseId) {
    const ws = await getMongoStudent(rawId);
    if (!ws) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    const [latest] = await db
      .select()
      .from(churnPredictionsTable)
      .where(eq(churnPredictionsTable.wiseStudentId, ws.wise_student_id))
      .orderBy(desc(churnPredictionsTable.computedAt));

    if (!latest) {
      // No prediction yet — return a low-risk placeholder rather than 404 so
      // the Parent Dashboard can render without a missing-data error.
      res.json({
        id: 0,
        studentId: ws.wise_student_id,
        riskScore: 0,
        reasons: ["No completed sessions yet"],
        signals: [],
        computedAt: new Date().toISOString(),
      });
      return;
    }

    res.json({
      id: latest.id,
      studentId: latest.wiseStudentId ?? latest.studentId,
      riskScore: latest.riskScore,
      reasons: latest.reasons,
      signals: latest.signals,
      computedAt: latest.computedAt.toISOString(),
    });
    return;
  }

  // ── Legacy Supabase student path ──
  const studentId = parseInt(rawId, 10);
  if (!Number.isFinite(studentId)) {
    res.status(400).json({ error: "Invalid student ID" });
    return;
  }

  const [latest] = await db
    .select()
    .from(churnPredictionsTable)
    .where(eq(churnPredictionsTable.studentId, studentId))
    .orderBy(desc(churnPredictionsTable.computedAt));

  let row = latest;
  if (!row || Date.now() - row.computedAt.getTime() > 6 * 60 * 60 * 1000) {
    const fresh = await computeAndStoreChurn(studentId);
    if (fresh) row = fresh;
  }
  if (!row) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json({
    id: row.id,
    studentId: row.studentId,
    riskScore: row.riskScore,
    reasons: row.reasons,
    signals: row.signals,
    computedAt: row.computedAt.toISOString(),
  });
});

router.get("/churn/alerts", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  // Find students linked to the current teacher
  const cls = await db.select().from(classesTable).where(eq(classesTable.teacherId, authReq.teacher.id));
  const studentIds = [...new Set(cls.map((c) => c.studentId).filter((v): v is number => v != null))];

  const alerts: { student: any; prediction: any }[] = [];
  for (const sid of studentIds) {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, sid));
    if (!student) continue;
    let [pred] = await db
      .select()
      .from(churnPredictionsTable)
      .where(eq(churnPredictionsTable.studentId, sid))
      .orderBy(desc(churnPredictionsTable.computedAt));
    if (!pred) {
      const fresh = await computeAndStoreChurn(sid);
      if (fresh) pred = fresh;
    }
    if (!pred) continue;
    if (pred.riskScore >= 50) {
      alerts.push({
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          grade: student.grade,
          subject: student.subject,
          primaryTeacherId: student.primaryTeacherId,
          avatarUrl: student.avatarUrl,
        },
        prediction: {
          id: pred.id,
          studentId: pred.studentId,
          riskScore: pred.riskScore,
          reasons: pred.reasons,
          signals: pred.signals,
          computedAt: pred.computedAt.toISOString(),
        },
      });
    }
  }
  alerts.sort((a, b) => b.prediction.riskScore - a.prediction.riskScore);
  res.json(alerts);
});

export default router;
