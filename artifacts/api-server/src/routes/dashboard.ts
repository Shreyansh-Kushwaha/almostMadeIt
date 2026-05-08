import { Router, type IRouter } from "express";
import { db, classesTable, reportsTable, teachersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const tid = authReq.teacher.id;

  const classes = await db.select().from(classesTable).where(eq(classesTable.teacherId, tid));
  const reports = await db.select().from(reportsTable).where(eq(reportsTable.teacherId, tid));

  const total = classes.length;
  const upcoming = classes.filter(c => c.status === "upcoming").length;
  const completed = classes.filter(c => c.status === "completed").length;

  const avgScore = reports.length > 0 ? reports.reduce((s, r) => s + r.overallScore, 0) / reports.length : 0;
  const avgEng = reports.length > 0 ? reports.reduce((s, r) => s + r.engagementScore, 0) / reports.length : 0;

  res.json({
    totalClasses: total,
    totalClassesChange: 12.5,
    avgAiScore: Math.round(avgScore * 10) / 10,
    avgAiScoreChange: 3.2,
    avgEngagement: Math.round(avgEng * 10) / 10,
    avgEngagementChange: 5.8,
    weeklyRating: 4.7,
    weeklyRatingChange: 0.3,
    upcomingCount: upcoming,
    completedCount: completed,
    reportsCount: reports.length,
  });
});

router.get("/dashboard/weekly-performance", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const today = new Date();

  const weekly = DAYS.map((day, i) => ({
    day,
    score: 65 + Math.round(Math.random() * 25) + (i === today.getDay() ? 5 : 0),
    engagement: 60 + Math.round(Math.random() * 30),
    classes: Math.floor(Math.random() * 4) + 1,
  }));

  res.json(weekly);
});

router.get("/dashboard/rankings", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;

  const fakeRankings = [
    { rank: 1, name: "Dr. Sarah Chen", subject: "Advanced Mathematics", score: 96.8, isCurrentTeacher: false },
    { rank: 2, name: "Prof. James Wilson", subject: "Physics", score: 94.2, isCurrentTeacher: false },
    { rank: 3, name: authReq.teacher.name, subject: authReq.teacher.subject, score: Math.round(authReq.teacher.avgScore * 10) / 10 || 91.5, isCurrentTeacher: true },
    { rank: 4, name: "Ms. Priya Sharma", subject: "Biology", score: 89.3, isCurrentTeacher: false },
    { rank: 5, name: "Mr. Carlos Rodriguez", subject: "History", score: 87.6, isCurrentTeacher: false },
    { rank: 6, name: "Dr. Emily Park", subject: "Chemistry", score: 85.9, isCurrentTeacher: false },
    { rank: 7, name: "Mr. Daniel Foster", subject: "English Literature", score: 83.4, isCurrentTeacher: false },
  ];

  res.json(fakeRankings);
});

export default router;
