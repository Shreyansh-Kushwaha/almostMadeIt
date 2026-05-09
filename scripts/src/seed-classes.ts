import { db, teachersTable, classesTable, sessionsTable, reportsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const DEMO_EMAIL = "teacher@supersheldon.com";

const upcomingClasses = [
  { studentName: "Aarav Mehta",     subject: "Algebra II",        grade: "Grade 10", platform: "zoom",  hoursAway: 1 },
  { studentName: "Sofia Rossi",     subject: "Trigonometry",      grade: "Grade 11", platform: "meet",  hoursAway: 4 },
  { studentName: "Liam O'Connor",   subject: "Physics — Optics",  grade: "Grade 12", platform: "zoom",  hoursAway: 26 },
  { studentName: "Mei Tanaka",      subject: "Calculus I",        grade: "Grade 12", platform: "teams", hoursAway: 50 },
];

const completedClasses = [
  {
    studentName: "Riya Patel",     subject: "Geometry",     grade: "Grade 9",
    daysAgo: 2,
    report: { overall: 92, engagement: 90, voice: 95, interaction: 88, noise: 12, confidence: 91, deadAir: 18, internet: 98,
      summary: "Strong session with excellent pacing. Student stayed engaged throughout proofs.",
      suggestions: ["Use more visual aids during theorem walk-throughs", "Add a 2-minute recap before transitions"],
      highlights: ["Clear explanation of triangle congruence", "Quick recovery from mic glitch at minute 14"],
      improvements: ["Slightly long monologue around minute 22"] },
  },
  {
    studentName: "Noah Brown",     subject: "Pre-Calculus",  grade: "Grade 11",
    daysAgo: 5,
    report: { overall: 87, engagement: 84, voice: 89, interaction: 85, noise: 22, confidence: 88, deadAir: 35, internet: 92,
      summary: "Solid teaching with a noticeable dip in engagement during the second half.",
      suggestions: ["Break problem sets into 5-minute chunks", "Ask a question every 4-5 minutes"],
      highlights: ["Great real-world example for limits"],
      improvements: ["Background noise spiked twice", "Dead air after question at minute 31"] },
  },
  {
    studentName: "Zara Hussein",   subject: "Statistics",    grade: "Grade 12",
    daysAgo: 9,
    report: { overall: 95, engagement: 96, voice: 94, interaction: 95, noise: 8, confidence: 96, deadAir: 9, internet: 99,
      summary: "Exceptional session — student asked deep follow-up questions.",
      suggestions: ["Consider extending office hours for this student"],
      highlights: ["Student-led derivation of the variance formula", "Crystal-clear audio"],
      improvements: [] },
  },
];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function main() {
  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.email, DEMO_EMAIL));
  if (!teacher) {
    console.error(`Demo teacher (${DEMO_EMAIL}) not found. Start the API server once so it self-seeds, then re-run.`);
    process.exit(1);
  }

  const existing = await db.select().from(classesTable).where(eq(classesTable.teacherId, teacher.id));
  if (existing.length > 0) {
    console.log(`Teacher already has ${existing.length} class(es). Skipping seed (delete from sheldon.classes if you want to reseed).`);
    process.exit(0);
  }

  const now = Date.now();

  for (const c of upcomingClasses) {
    await db.insert(classesTable).values({
      teacherId: teacher.id,
      studentName: c.studentName,
      subject: c.subject,
      grade: c.grade,
      platform: c.platform,
      meetingUrl: `https://${c.platform}.example.com/${Math.random().toString(36).slice(2, 10)}`,
      scheduledAt: new Date(now + c.hoursAway * HOUR),
      durationMinutes: 60,
      status: "upcoming",
    });
  }

  for (const c of completedClasses) {
    const scheduledAt = new Date(now - c.daysAgo * DAY);
    const [insertedClass] = await db.insert(classesTable).values({
      teacherId: teacher.id,
      studentName: c.studentName,
      subject: c.subject,
      grade: c.grade,
      platform: "zoom",
      scheduledAt,
      durationMinutes: 60,
      status: "completed",
    }).returning();

    const [insertedSession] = await db.insert(sessionsTable).values({
      teacherId: teacher.id,
      classId: insertedClass.id,
      startedAt: scheduledAt,
      finishedAt: new Date(scheduledAt.getTime() + 60 * 60 * 1000),
      status: "finished",
    }).returning();

    const timeline = Array.from({ length: 12 }, (_, i) => ({
      minute: i * 5,
      engagement: Math.max(50, c.report.engagement + Math.round((Math.random() - 0.5) * 16)),
      voiceClarity: Math.max(60, c.report.voice + Math.round((Math.random() - 0.5) * 10)),
      noise: Math.max(0, c.report.noise + Math.round((Math.random() - 0.5) * 8)),
    }));

    await db.insert(reportsTable).values({
      teacherId: teacher.id,
      classId: insertedClass.id,
      sessionId: insertedSession.id,
      overallScore: c.report.overall,
      engagementScore: c.report.engagement,
      voiceClarityScore: c.report.voice,
      interactionScore: c.report.interaction,
      noiseLevel: c.report.noise,
      speakingConfidence: c.report.confidence,
      deadAirSeconds: c.report.deadAir,
      internetStability: c.report.internet,
      aiSummary: c.report.summary,
      suggestions: c.report.suggestions,
      highlights: c.report.highlights,
      improvementAreas: c.report.improvements,
      timelineData: timeline,
    });
  }

  console.log(`Seeded ${upcomingClasses.length} upcoming + ${completedClasses.length} completed classes (with reports) for ${DEMO_EMAIL}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
