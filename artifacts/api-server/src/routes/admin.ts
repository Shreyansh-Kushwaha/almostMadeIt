import { Router, type IRouter } from "express";
import {
  db,
  teachersTable,
  studentsTable,
  classesTable,
  reportsTable,
  sessionsTable,
  churnPredictionsTable,
} from "@workspace/db";
import { eq, desc, gte, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  listTeachers as listMongoTeachers,
  listStudents as listMongoStudents,
  countTeachers as countMongoTeachers,
  countStudents as countMongoStudents,
} from "@workspace/mongo";

const router: IRouter = Router();

router.get("/admin/teachers", requireAuth, async (_req, res): Promise<void> => {
  // Read teacher population from Mongo (Wise is the source of truth).
  const wiseTeachers = await listMongoTeachers({ limit: 5000 });
  // Reports/sessions stay in Supabase but are keyed by int teacherId today, so
  // most Wise teachers have none. Future-Phase: rekey on wise_teacher_id.
  // For now, returns Wise teachers with 0 for the AI-derived metrics until
  // we generate ClassPulse reports against Wise IDs.
  if (wiseTeachers.length > 0) {
    const out = wiseTeachers.map((t) => ({
      teacher: {
        id: t.wise_teacher_id,
        name: t.name ?? "Teacher",
        email: t.email ?? "",
        subject: "Multiple",
        avatarUrl: null,
        totalClasses: t.classes?.length ?? 0,
        avgScore: 0,
      },
      avgEngagement: 0,
      avgUnderstanding: 0,
      churnRiskAvg: 0,
      sessionsLast30d: 0,
    }));
    out.sort((a, b) => b.teacher.totalClasses - a.teacher.totalClasses);
    res.json(out);
    return;
  }

  // Legacy Supabase path (kept as fallback)
  const teachers = await db.select().from(teachersTable);
  const allClasses = await db.select().from(classesTable);
  const allReports = await db.select().from(reportsTable);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentSessions = await db
    .select()
    .from(sessionsTable)
    .where(gte(sessionsTable.startedAt, since));

  // After the Wise migration the FK columns are nullable; skip rows where
  // they're missing instead of using 0 (which would collide on the legit id=0).
  const classesByT = new Map<number, number>();
  for (const c of allClasses) {
    if (c.teacherId == null) continue;
    classesByT.set(c.teacherId, (classesByT.get(c.teacherId) ?? 0) + 1);
  }
  const reportsByT = new Map<number, (typeof reportsTable.$inferSelect)[]>();
  for (const r of allReports) {
    if (r.teacherId == null) continue;
    const list = reportsByT.get(r.teacherId) ?? [];
    list.push(r);
    reportsByT.set(r.teacherId, list);
  }
  const sessionsByT = new Map<number, number>();
  for (const s of recentSessions) {
    if (s.teacherId == null) continue;
    sessionsByT.set(s.teacherId, (sessionsByT.get(s.teacherId) ?? 0) + 1);
  }

  const out = teachers.map((t) => {
    const reps = reportsByT.get(t.id) ?? [];
    const liveClassCount = classesByT.get(t.id) ?? 0;
    const avg = (k: keyof typeof reportsTable.$inferSelect) =>
      reps.length ? reps.reduce((a, r) => a + (Number(r[k] ?? 0) || 0), 0) / reps.length : 0;
    const liveAvgScore = avg("overallScore");
    return {
      teacher: {
        id: t.id,
        name: t.name,
        email: t.email,
        subject: t.subject,
        avatarUrl: t.avatarUrl,
        // Live counts so non-Alekhya teachers don't show 0 when they actually
        // have classes/reports (stored columns were never backfilled).
        totalClasses: liveClassCount || t.totalClasses,
        avgScore: round(liveAvgScore || t.avgScore),
      },
      avgEngagement: round(avg("engagementScore")),
      avgUnderstanding: round(avg("understandingScore")),
      churnRiskAvg: round(avg("churnRiskScore")),
      sessionsLast30d: sessionsByT.get(t.id) ?? 0,
    };
  });

  // Sort by total classes desc so the active teachers surface first.
  out.sort((a, b) => b.teacher.totalClasses - a.teacher.totalClasses);
  res.json(out);
});

// Stable negative-id hash so synthesized students keep the same id across
// requests. Mirrors the helper in routes/students.ts.
function syntheticIdFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return -Math.abs(h) || -1;
}

router.get("/admin/students", requireAuth, async (_req, res): Promise<void> => {
  // Wise (Mongo) is the source of truth for the student population.
  const wiseStudents = await listMongoStudents({ limit: 10_000 });
  if (wiseStudents.length > 0) {
    const out = wiseStudents.map((s) => ({
      student: {
        id: s.wise_student_id,
        name: s.name ?? "Student",
        email: s.email,
        grade: s.grade,
        subject: s.subject,
        primaryTeacherId: null,
        avatarUrl: null,
      },
      classCount: s.classes?.length ?? 0,
      avgEngagement: 0,
      avgUnderstanding: 0,
      churnRiskScore: 0,
      lastSessionAt: null,
    }));
    out.sort((a, b) => b.classCount - a.classCount);
    res.json(out);
    return;
  }

  // Legacy Supabase fallback (kept for old data path)
  const allStudents = await db.select().from(studentsTable);
  const allClasses = await db.select().from(classesTable);
  const allReports = await db.select().from(reportsTable);
  const allChurn = await db.select().from(churnPredictionsTable).orderBy(desc(churnPredictionsTable.computedAt));

  const realNamesLower = new Set(allStudents.map((s) => s.name.trim().toLowerCase()));

  // class index by FK + by name
  const classesByStudentId = new Map<number, (typeof classesTable.$inferSelect)[]>();
  const classesByName = new Map<string, (typeof classesTable.$inferSelect)[]>();
  for (const c of allClasses) {
    if (c.studentId != null) {
      (classesByStudentId.get(c.studentId) ?? classesByStudentId.set(c.studentId, []).get(c.studentId)!).push(c);
    }
    const key = c.studentName.trim().toLowerCase();
    (classesByName.get(key) ?? classesByName.set(key, []).get(key)!).push(c);
  }
  const reportsByClassId = new Map<number, (typeof reportsTable.$inferSelect)[]>();
  for (const r of allReports) {
    if (r.classId == null) continue;
    (reportsByClassId.get(r.classId) ?? reportsByClassId.set(r.classId, []).get(r.classId)!).push(r);
  }
  const churnByStudentId = new Map<number, typeof churnPredictionsTable.$inferSelect>();
  for (const ch of allChurn) {
    if (ch.studentId == null) continue;
    if (!churnByStudentId.has(ch.studentId)) churnByStudentId.set(ch.studentId, ch);
  }

  type Row = {
    student: {
      id: number; name: string; email: string | null; grade: string | null;
      subject: string | null; primaryTeacherId: number | null; avatarUrl: string | null;
    };
    classCount: number;
    avgEngagement: number;
    avgUnderstanding: number;
    churnRiskScore: number;
    lastSessionAt: string | null;
  };

  const out: Row[] = [];

  // Real students first.
  for (const s of allStudents) {
    const cls = classesByStudentId.get(s.id) ?? [];
    const reps: (typeof reportsTable.$inferSelect)[] = [];
    for (const c of cls) reps.push(...(reportsByClassId.get(c.id) ?? []));
    const avgEng = reps.length ? reps.reduce((a, r) => a + r.engagementScore, 0) / reps.length : 0;
    const avgUnd = reps.length
      ? reps.reduce((a, r) => a + (r.understandingScore ?? 0), 0) / reps.length
      : 0;
    const lastSession = reps.length
      ? reps.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
      : null;
    const ch = churnByStudentId.get(s.id);
    out.push({
      student: {
        id: s.id, name: s.name, email: s.email, grade: s.grade,
        subject: s.subject, primaryTeacherId: s.primaryTeacherId, avatarUrl: s.avatarUrl,
      },
      classCount: cls.length,
      avgEngagement: round(avgEng),
      avgUnderstanding: round(avgUnd),
      churnRiskScore: ch ? round(ch.riskScore) : 0,
      lastSessionAt: lastSession ? lastSession.toISOString() : null,
    });
  }

  // Synthesized students from class.studentName that don't have a real row.
  const seenSynth = new Set<string>();
  for (const [nameKey, cls] of classesByName) {
    if (realNamesLower.has(nameKey)) continue;
    if (seenSynth.has(nameKey)) continue;
    seenSynth.add(nameKey);
    const sample = cls[0];
    const reps: (typeof reportsTable.$inferSelect)[] = [];
    for (const c of cls) reps.push(...(reportsByClassId.get(c.id) ?? []));
    const avgEng = reps.length ? reps.reduce((a, r) => a + r.engagementScore, 0) / reps.length : 0;
    const avgUnd = reps.length
      ? reps.reduce((a, r) => a + (r.understandingScore ?? 0), 0) / reps.length
      : 0;
    const lastSession = reps.length
      ? reps.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
      : null;
    out.push({
      student: {
        id: syntheticIdFromName(nameKey),
        name: sample.studentName,
        email: null,
        grade: sample.grade,
        subject: sample.subject,
        primaryTeacherId: null,
        avatarUrl: null,
      },
      classCount: cls.length,
      avgEngagement: round(avgEng),
      avgUnderstanding: round(avgUnd),
      churnRiskScore: 0,
      lastSessionAt: lastSession ? lastSession.toISOString() : null,
    });
  }

  // Sort by class activity desc so most-active students surface first.
  out.sort((a, b) => b.classCount - a.classCount);
  res.json(out);
});

router.get("/admin/retention", requireAuth, async (_req, res): Promise<void> => {
  // Wise totals — true source for population counts.
  const totalStudentsWise = await countMongoStudents();
  if (totalStudentsWise > 0) {
    // We don't have ClassPulse churn data keyed by wise_student_id yet, so
    // every student bucket lands in "Low" for now. Phase 2 will compute churn
    // from session signals + our reports keyed by Wise IDs.
    res.json({
      totalStudents: totalStudentsWise,
      atRisk: 0,
      churned30d: 0,
      retainedRate: 1,
      riskBuckets: [
        { label: "Low", count: totalStudentsWise },
        { label: "Medium", count: 0 },
        { label: "High", count: 0 },
        { label: "Critical", count: 0 },
      ],
    });
    return;
  }

  // Legacy Supabase fallback
  const realStudents = await db.select().from(studentsTable);
  const allClasses = await db.select().from(classesTable);
  const allChurn = await db.select().from(churnPredictionsTable);

  const realNamesLower = new Set(realStudents.map((s) => s.name.trim().toLowerCase()));
  const synthNames = new Set<string>();
  for (const c of allClasses) {
    const key = c.studentName.trim().toLowerCase();
    if (!realNamesLower.has(key)) synthNames.add(key);
  }
  const totalStudents = realStudents.length + synthNames.size;

  // Latest churn prediction per real student (synthesized students have none).
  const latestByStudentId = new Map<number, typeof churnPredictionsTable.$inferSelect>();
  for (const ch of allChurn) {
    if (ch.studentId == null) continue;
    const prev = latestByStudentId.get(ch.studentId);
    if (!prev || ch.computedAt > prev.computedAt) latestByStudentId.set(ch.studentId, ch);
  }
  let atRisk = 0;
  const buckets = { Low: 0, Medium: 0, High: 0, Critical: 0 } as Record<string, number>;
  for (const s of realStudents) {
    const r = latestByStudentId.get(s.id)?.riskScore ?? 0;
    if (r >= 50) atRisk++;
    if (r < 25) buckets.Low++;
    else if (r < 50) buckets.Medium++;
    else if (r < 75) buckets.High++;
    else buckets.Critical++;
  }
  // Bucket the synthesized students into "Low" since we have no churn signal —
  // keeps the chart proportional to the actual student population.
  buckets.Low += synthNames.size;

  res.json({
    totalStudents,
    atRisk,
    churned30d: 0,
    retainedRate: totalStudents > 0 ? round((totalStudents - atRisk) / totalStudents) : 1,
    riskBuckets: Object.entries(buckets).map(([label, count]) => ({ label, count })),
  });
});

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export default router;
