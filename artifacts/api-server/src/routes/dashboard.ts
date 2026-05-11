import { Router, type IRouter } from "express";
import { db, classesTable, reportsTable } from "@workspace/db";
import { eq, and, gte, lt } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { listSessions as listMongoSessions, getMongoDb } from "@workspace/mongo";

const router: IRouter = Router();

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function pctChange(current: number, prior: number): number {
  if (prior === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;

  // ── Wise (Mongo) teacher → counts come from wise_course_sessions,
  //    AI scores come from any Wise-keyed reports we've already generated ──
  if (authReq.teacher.wiseTeacherId) {
    const mdb = await getMongoDb();
    const teacherFilter = {
      $or: [
        { "userId._id": authReq.teacher.wiseTeacherId },
        { teacher_id: authReq.teacher.wiseTeacherId },
        { userId: authReq.teacher.wiseTeacherId },
      ],
    };
    const now = new Date();
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const col = mdb.collection("wise_course_sessions");
    const [total, upcoming, completed, currentWeek, priorWeek, wiseReports] = await Promise.all([
      col.countDocuments(teacherFilter),
      col.countDocuments({ $and: [teacherFilter, { meetingStatus: { $in: ["UPCOMING", "NOT_STARTED"] } }] }),
      col.countDocuments({ $and: [teacherFilter, { meetingStatus: "ENDED" }] }),
      col.countDocuments({ $and: [teacherFilter, { scheduled_start_time_dt: { $gte: sevenDaysAgo, $lt: now } }] }),
      col.countDocuments({ $and: [teacherFilter, { scheduled_start_time_dt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }] }),
      db.select().from(reportsTable).where(eq(reportsTable.wiseTeacherId, authReq.teacher.wiseTeacherId)),
    ]);
    const totalClassesChange = priorWeek === 0
      ? (currentWeek === 0 ? 0 : 100)
      : Math.round(((currentWeek - priorWeek) / priorWeek) * 1000) / 10;

    const avgOf = (xs: number[]) =>
      xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    const recentWise = wiseReports.filter((r) => r.createdAt >= sevenDaysAgo);
    const priorWise = wiseReports.filter((r) => r.createdAt >= fourteenDaysAgo && r.createdAt < sevenDaysAgo);
    const avgAiScore = avgOf(wiseReports.map((r) => r.overallScore));
    const avgEng = avgOf(wiseReports.map((r) => r.engagementScore));
    const recentAvgScore = avgOf(recentWise.map((r) => r.overallScore));
    const priorAvgScore = avgOf(priorWise.map((r) => r.overallScore));
    const recentAvgEng = avgOf(recentWise.map((r) => r.engagementScore));
    const priorAvgEng = avgOf(priorWise.map((r) => r.engagementScore));
    const pct = (cur: number, prv: number) =>
      prv === 0 ? (cur === 0 ? 0 : 100) : Math.round(((cur - prv) / prv) * 1000) / 10;

    res.json({
      totalClasses: total,
      totalClassesChange,
      avgAiScore: Math.round(avgAiScore * 10) / 10,
      avgAiScoreChange: pct(recentAvgScore, priorAvgScore),
      avgEngagement: Math.round(avgEng * 10) / 10,
      avgEngagementChange: pct(recentAvgEng, priorAvgEng),
      weeklyRating: 0,
      weeklyRatingChange: 0,
      upcomingCount: upcoming,
      completedCount: completed,
      reportsCount: wiseReports.length,
    });
    return;
  }

  // ── Legacy Supabase teacher ──
  const tid = authReq.teacher.id;

  const classes = await db.select().from(classesTable).where(eq(classesTable.teacherId, tid));
  const reports = await db.select().from(reportsTable).where(eq(reportsTable.teacherId, tid));

  const total = classes.length;
  const upcoming = classes.filter((c) => c.status === "upcoming").length;
  const completed = classes.filter((c) => c.status === "completed").length;

  // Real change deltas — compare last 7 days vs the 7 days before that.
  const now = new Date();
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const currentWeekReports = reports.filter((r) => r.createdAt >= sevenDaysAgo);
  const priorWeekReports = reports.filter((r) => r.createdAt >= fourteenDaysAgo && r.createdAt < sevenDaysAgo);
  const currentWeekClasses = classes.filter((c) => c.scheduledAt >= sevenDaysAgo);
  const priorWeekClasses = classes.filter((c) => c.scheduledAt >= fourteenDaysAgo && c.scheduledAt < sevenDaysAgo);

  const avgScore = avg(reports.map((r) => r.overallScore));
  const avgEng = avg(reports.map((r) => r.engagementScore));
  const currentAvgScore = avg(currentWeekReports.map((r) => r.overallScore));
  const priorAvgScore = avg(priorWeekReports.map((r) => r.overallScore));
  const currentAvgEng = avg(currentWeekReports.map((r) => r.engagementScore));
  const priorAvgEng = avg(priorWeekReports.map((r) => r.engagementScore));
  const currentAvgUnderstanding = avg(
    currentWeekReports.map((r) => r.understandingScore).filter((x): x is number => x != null),
  );
  const priorAvgUnderstanding = avg(
    priorWeekReports.map((r) => r.understandingScore).filter((x): x is number => x != null),
  );

  res.json({
    totalClasses: total,
    totalClassesChange: pctChange(currentWeekClasses.length, priorWeekClasses.length),
    avgAiScore: Math.round(avgScore * 10) / 10,
    avgAiScoreChange: pctChange(currentAvgScore, priorAvgScore),
    avgEngagement: Math.round(avgEng * 10) / 10,
    avgEngagementChange: pctChange(currentAvgEng, priorAvgEng),
    // weeklyRating now reflects current 7-day avg understanding (out of 5)
    // for teachers — derived, not invented.
    weeklyRating: Math.round((currentAvgUnderstanding / 20) * 10) / 10,
    weeklyRatingChange: pctChange(currentAvgUnderstanding, priorAvgUnderstanding),
    upcomingCount: upcoming,
    completedCount: completed,
    reportsCount: reports.length,
  });
});

router.get("/dashboard/weekly-performance", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;

  // ── Wise (Mongo) teacher → class counts per day from wise_course_sessions ──
  if (authReq.teacher.wiseTeacherId) {
    const today = startOfDay(new Date());
    const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const mdb = await getMongoDb();
    const sessions = await mdb.collection("wise_course_sessions").find({
      $or: [
        { "userId._id": authReq.teacher.wiseTeacherId },
        { teacher_id: authReq.teacher.wiseTeacherId },
        { userId: authReq.teacher.wiseTeacherId },
      ],
      scheduled_start_time_dt: { $gte: sevenDaysAgo, $lt: tomorrow },
    }).toArray();

    type B = { date: Date; day: string; classCount: number };
    const buckets: B[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo); d.setDate(d.getDate() + i);
      buckets.push({ date: d, day: DAYS[d.getDay()], classCount: 0 });
    }
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    for (const s of sessions) {
      const sd = s.scheduled_start_time_dt instanceof Date ? s.scheduled_start_time_dt : new Date(s.scheduled_start_time_dt);
      const b = buckets.find((x) => sameDay(x.date, sd));
      if (b) b.classCount++;
    }
    res.json(buckets.map((b) => ({ day: b.day, score: 0, engagement: 0, classes: b.classCount })));
    return;
  }

  // ── Legacy Supabase teacher ──
  const tid = authReq.teacher.id;

  const today = startOfDay(new Date());
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const reports = await db
    .select()
    .from(reportsTable)
    .where(and(
      eq(reportsTable.teacherId, tid),
      gte(reportsTable.createdAt, sevenDaysAgo),
      lt(reportsTable.createdAt, tomorrow),
    ));
  const classes = await db
    .select()
    .from(classesTable)
    .where(and(
      eq(classesTable.teacherId, tid),
      gte(classesTable.scheduledAt, sevenDaysAgo),
      lt(classesTable.scheduledAt, tomorrow),
    ));

  // Build day buckets keyed by ISO date (yyyy-mm-dd) for the last 7 days in
  // chronological order. Then group reports + classes into those buckets.
  type Bucket = { date: Date; day: string; scores: number[]; engagements: number[]; classCount: number };
  const buckets: Bucket[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo); d.setDate(d.getDate() + i);
    buckets.push({ date: d, day: DAYS[d.getDay()], scores: [], engagements: [], classCount: 0 });
  }
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  for (const r of reports) {
    const b = buckets.find((x) => sameDay(x.date, r.createdAt));
    if (b) {
      b.scores.push(r.overallScore);
      b.engagements.push(r.engagementScore);
    }
  }
  for (const c of classes) {
    const b = buckets.find((x) => sameDay(x.date, c.scheduledAt));
    if (b) b.classCount++;
  }

  res.json(
    buckets.map((b) => ({
      day: b.day,
      score: Math.round(avg(b.scores)),
      engagement: Math.round(avg(b.engagements)),
      classes: b.classCount,
    }))
  );
});

export default router;
