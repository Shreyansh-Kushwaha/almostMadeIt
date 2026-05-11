// ─────────────────────────────────────────────────────────────────────────────
// Demo mode fixtures — used by the "Demo" teacher profile on the picker.
// When demo mode is active, every API call returns the hardcoded data here,
// bypassing the network so the app is safe to show to judges even if the
// backend is down or has no real data.
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_TOKEN = "demo-token";
export const DEMO_TEACHER_ID = -1; // sentinel — never written to DB

const DEMO_TEACHER = {
  id: DEMO_TEACHER_ID,
  name: "Demo",
  email: "demo@classpulse.ai",
  subject: "Mathematics & Science",
  avatarUrl: null,
  totalClasses: 42,
  avgScore: 88.5,
};

// ── Students (5 with varied risk profiles) ───────────────────────────────────

const DEMO_STUDENTS = [
  { id: 101, name: "Aria Patel",      email: "aria@demo.app",      grade: "8",  subject: "Mathematics", primaryTeacherId: DEMO_TEACHER_ID, avatarUrl: null, churn: { risk: 18, label: "Low",      reasons: ["Engagement steady", "Attendance healthy", "Confidence scores improving"] } },
  { id: 102, name: "Noah Kim",        email: "noah@demo.app",      grade: "9",  subject: "Physics",     primaryTeacherId: DEMO_TEACHER_ID, avatarUrl: null, churn: { risk: 64, label: "High",     reasons: ["Engagement dipped 18%", "Two missed prep questions", "Lower interaction in last 3 sessions"] } },
  { id: 103, name: "Sofia Rodriguez", email: "sofia@demo.app",     grade: "7",  subject: "Chemistry",   primaryTeacherId: DEMO_TEACHER_ID, avatarUrl: null, churn: { risk: 32, label: "Medium",   reasons: ["Engagement moderate", "Occasional silent stretches", "Quiz accuracy up"] } },
  { id: 104, name: "Liam Chen",       email: "liam@demo.app",      grade: "10", subject: "Mathematics", primaryTeacherId: DEMO_TEACHER_ID, avatarUrl: null, churn: { risk: 81, label: "Critical", reasons: ["Engagement dropped 28% over last 3 sessions", "2 cancellations in last 30 days", "Long silent stretches in last lesson"] } },
  { id: 105, name: "Maya Iyer",       email: "maya@demo.app",      grade: "8",  subject: "Mathematics", primaryTeacherId: DEMO_TEACHER_ID, avatarUrl: null, churn: { risk: 25, label: "Low",      reasons: ["Strong question quality", "Consistent attendance", "Confidence rising"] } },
];

function churnFor(studentId: number) {
  const s = DEMO_STUDENTS.find((x) => x.id === studentId);
  if (!s) return null;
  return {
    id: studentId * 10,
    studentId,
    riskScore: s.churn.risk,
    reasons: s.churn.reasons,
    signals: [
      { name: "engagement_avg",    value: 100 - s.churn.risk + 20 },
      { name: "attendance_rate",   value: Math.max(50, 100 - Math.round(s.churn.risk * 0.4)) },
      { name: "cancellations_30d", value: s.churn.risk > 60 ? 2 : s.churn.risk > 30 ? 1 : 0 },
    ],
    computedAt: new Date().toISOString(),
  };
}

// ── Classes (8 — mix of upcoming and completed) ──────────────────────────────

function isoDaysFromNow(days: number, hour = 16): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const DEMO_CLASSES = [
  { id: 201, teacherId: DEMO_TEACHER_ID, studentId: 101, studentName: "Aria Patel",      subject: "Algebra II",     scheduledAt: isoDaysFromNow(0, 17), durationMinutes: 60, platform: "zoom",        meetingUrl: null, status: "upcoming",   grade: "8",  notes: null },
  { id: 202, teacherId: DEMO_TEACHER_ID, studentId: 102, studentName: "Noah Kim",        subject: "Kinematics",     scheduledAt: isoDaysFromNow(0, 19), durationMinutes: 45, platform: "google_meet", meetingUrl: null, status: "upcoming",   grade: "9",  notes: null },
  { id: 203, teacherId: DEMO_TEACHER_ID, studentId: 103, studentName: "Sofia Rodriguez", subject: "Atomic Theory",  scheduledAt: isoDaysFromNow(1, 16), durationMinutes: 60, platform: "zoom",        meetingUrl: null, status: "upcoming",   grade: "7",  notes: null },
  { id: 204, teacherId: DEMO_TEACHER_ID, studentId: 104, studentName: "Liam Chen",       subject: "Calculus",       scheduledAt: isoDaysFromNow(2, 18), durationMinutes: 60, platform: "teams",       meetingUrl: null, status: "upcoming",   grade: "10", notes: null },
  { id: 205, teacherId: DEMO_TEACHER_ID, studentId: 105, studentName: "Maya Iyer",       subject: "Geometry",       scheduledAt: isoDaysFromNow(3, 17), durationMinutes: 45, platform: "zoom",        meetingUrl: null, status: "upcoming",   grade: "8",  notes: null },
  { id: 206, teacherId: DEMO_TEACHER_ID, studentId: 101, studentName: "Aria Patel",      subject: "Algebra II",     scheduledAt: isoDaysFromNow(-1, 17),durationMinutes: 60, platform: "zoom",        meetingUrl: null, status: "completed",  grade: "8",  notes: null },
  { id: 207, teacherId: DEMO_TEACHER_ID, studentId: 102, studentName: "Noah Kim",        subject: "Energy",         scheduledAt: isoDaysFromNow(-2, 19),durationMinutes: 45, platform: "google_meet", meetingUrl: null, status: "completed",  grade: "9",  notes: null },
  { id: 208, teacherId: DEMO_TEACHER_ID, studentId: 104, studentName: "Liam Chen",       subject: "Limits",         scheduledAt: isoDaysFromNow(-3, 18),durationMinutes: 60, platform: "teams",       meetingUrl: null, status: "cancelled",  grade: "10", notes: null },
];

// ── Reports (4 finished sessions) ────────────────────────────────────────────

function moodTimeline(): { minute: number; mood: string; valence: number; energy: number }[] {
  return [
    { minute: 0,  mood: "Curious",   valence:  0.30, energy: 0.55 },
    { minute: 5,  mood: "Engaged",   valence:  0.55, energy: 0.70 },
    { minute: 10, mood: "Engaged",   valence:  0.60, energy: 0.75 },
    { minute: 15, mood: "Confused",  valence: -0.10, energy: 0.40 },
    { minute: 20, mood: "Confused",  valence: -0.20, energy: 0.35 },
    { minute: 25, mood: "Recovering",valence:  0.10, energy: 0.50 },
    { minute: 30, mood: "Engaged",   valence:  0.45, energy: 0.65 },
    { minute: 35, mood: "Focused",   valence:  0.50, energy: 0.70 },
    { minute: 40, mood: "Focused",   valence:  0.55, energy: 0.75 },
    { minute: 45, mood: "Satisfied", valence:  0.70, energy: 0.60 },
  ];
}

function confusionTimeline(): { minute: number; confusion: number }[] {
  return [
    { minute: 0, confusion: 12 }, { minute: 5,  confusion: 18 },
    { minute: 10, confusion: 22 }, { minute: 15, confusion: 78 },
    { minute: 20, confusion: 70 }, { minute: 25, confusion: 42 },
    { minute: 30, confusion: 25 }, { minute: 35, confusion: 18 },
    { minute: 40, confusion: 14 }, { minute: 45, confusion: 10 },
  ];
}

function makeReport(opts: { id: number; classId: number; sessionId: number; overall: number; engagement: number; understanding: number; satisfaction: number; compatibility: number; churnRisk: number; summary: string; }) {
  // Look up the matching class so Reports list + ReportDetail can show the
  // student name and subject (both pages read `report.class?.studentName`).
  const cls = DEMO_CLASSES.find((c) => c.id === opts.classId);
  return {
    id: opts.id,
    sessionId: opts.sessionId,
    classId: opts.classId,
    teacherId: DEMO_TEACHER_ID,
    class: cls
      ? { id: cls.id, studentName: cls.studentName, subject: cls.subject }
      : { id: opts.classId, studentName: "Demo Student", subject: "Demo Subject" },
    overallScore: opts.overall,
    engagementScore: opts.engagement,
    voiceClarityScore: 86,
    interactionScore: 78,
    noiseLevel: 12,
    speakingConfidence: 84,
    deadAirSeconds: 38,
    internetStability: 96,
    understandingScore: opts.understanding,
    satisfactionScore: opts.satisfaction,
    teacherCompatibilityScore: opts.compatibility,
    churnRiskScore: opts.churnRisk,
    aiSummary: opts.summary,
    suggestions: [
      "Break long explanations into 90-second chunks followed by a quick check question.",
      "When confusion spikes, switch from telling to asking — let the student narrate the next step.",
      "Keep the closing-minute recap consistent; it correlates with retention.",
    ],
    highlights: [
      "Strong recovery after the 15-min confusion dip.",
      "Quiz accuracy improved 22% over previous session.",
      "Student initiated 3 follow-up questions — high curiosity.",
    ],
    improvementAreas: [
      "Initial framing felt rushed — slow the first 2 minutes.",
      "Long monologue around the 15-min mark caused the dip.",
    ],
    timelineData: [
      { minute: 0,  engagement: 60, voiceClarity: 88, noise: 12 },
      { minute: 5,  engagement: 72, voiceClarity: 90, noise: 10 },
      { minute: 10, engagement: 78, voiceClarity: 86, noise: 11 },
      { minute: 15, engagement: 45, voiceClarity: 82, noise: 14 },
      { minute: 20, engagement: 52, voiceClarity: 85, noise: 13 },
      { minute: 25, engagement: 68, voiceClarity: 88, noise: 12 },
      { minute: 30, engagement: 76, voiceClarity: 90, noise: 11 },
      { minute: 35, engagement: 80, voiceClarity: 91, noise: 10 },
      { minute: 40, engagement: 84, voiceClarity: 90, noise: 10 },
      { minute: 45, engagement: 82, voiceClarity: 89, noise: 11 },
    ],
    moodTimeline: moodTimeline(),
    confusionTimeline: confusionTimeline(),
    createdAt: new Date(Date.now() - opts.id * 86400000).toISOString(),
  };
}

const DEMO_REPORTS = [
  makeReport({ id: 301, classId: 206, sessionId: 401, overall: 88, engagement: 84, understanding: 82, satisfaction: 90, compatibility: 92, churnRisk: 18, summary: "Aria had a strong session — clear curve through the algebra factoring section after a brief confusion dip mid-class. Her quiz accuracy rose to 92%. Recommend continuing the call-and-response style." }),
  makeReport({ id: 302, classId: 207, sessionId: 402, overall: 72, engagement: 68, understanding: 64, satisfaction: 74, compatibility: 80, churnRisk: 64, summary: "Noah's engagement dipped through the middle of the energy unit. He stayed quiet during the worked example. Consider opening the next session with a 2-min recap quiz on momentum." }),
  makeReport({ id: 303, classId: 203, sessionId: 403, overall: 81, engagement: 79, understanding: 78, satisfaction: 82, compatibility: 86, churnRisk: 32, summary: "Sofia followed the periodic-table walkthrough well; asked two great clarifying questions about isotopes." }),
  makeReport({ id: 304, classId: 208, sessionId: 404, overall: 65, engagement: 58, understanding: 56, satisfaction: 60, compatibility: 70, churnRisk: 81, summary: "Liam disengaged after the limits proof. Recommend a one-on-one check-in this week — risk of drop-off is high." }),
];

// ── Parent reports ───────────────────────────────────────────────────────────

function parentReport(studentId: number) {
  const s = DEMO_STUDENTS.find((x) => x.id === studentId);
  if (!s) return null;
  return {
    id: studentId,
    studentId,
    periodStart: isoDaysFromNow(-14),
    periodEnd: new Date().toISOString(),
    engagementScore: Math.max(50, 100 - s.churn.risk),
    understandingScore: Math.max(55, 95 - s.churn.risk),
    confidenceScore: Math.max(50, 92 - s.churn.risk),
    summary: `${s.name} has been working on ${s.subject.toLowerCase()} over the past two weeks. ${s.churn.risk < 35 ? "Engagement and confidence are trending up — keep encouraging the daily practice routine." : s.churn.risk < 65 ? "Generally engaged with a couple of dips when topics get abstract. A weekly review of new vocabulary will help." : "Engagement has been uneven recently — a brief reset conversation about goals would help."}`,
    strengths: [
      "Asks specific questions when stuck instead of giving up",
      "Comes prepared with notes from the previous session",
      s.churn.risk < 50 ? "Consistently completes practice problems" : "Stays calm under tougher problem sets",
    ],
    weakAreas: [
      "Tends to rush the first read of word problems",
      s.churn.risk > 50 ? "Goes quiet when concepts feel unfamiliar — needs to surface confusion sooner" : "Could push deeper on edge cases",
    ],
    recommendations: [
      `Set aside 15 minutes 3× this week for short practice on ${s.subject.toLowerCase()} fundamentals.`,
      "Ask them to explain back the trickiest concept from class — teaching it cements it.",
      "Celebrate a specific win this week — small recognitions compound.",
    ],
  };
}

// ── Sessions (one active so Monitor flow works) ──────────────────────────────

let activeDemoSession: { id: number; classId: number; teacherId: number; startedAt: string; status: string } | null = null;

// ── Other admin-shaped fixtures ──────────────────────────────────────────────

function adminTeachers() {
  return [
    { teacher: { id: DEMO_TEACHER_ID, name: "Demo",            email: "demo@classpulse.ai",  subject: "Mathematics & Science", avatarUrl: null, totalClasses: 42, avgScore: 88.5 }, avgEngagement: 84, avgUnderstanding: 81, churnRiskAvg: 36, sessionsLast30d: 28 },
    { teacher: { id: 9001, name: "Priya Sharma",     email: "priya@demo.app",      subject: "Biology",               avatarUrl: null, totalClasses: 31, avgScore: 86.2 }, avgEngagement: 79, avgUnderstanding: 80, churnRiskAvg: 28, sessionsLast30d: 22 },
    { teacher: { id: 9002, name: "Carlos Rodriguez", email: "carlos@demo.app",     subject: "History",               avatarUrl: null, totalClasses: 24, avgScore: 81.4 }, avgEngagement: 73, avgUnderstanding: 75, churnRiskAvg: 41, sessionsLast30d: 18 },
    { teacher: { id: 9003, name: "Emily Park",       email: "emily@demo.app",      subject: "Chemistry",             avatarUrl: null, totalClasses: 27, avgScore: 85.0 }, avgEngagement: 81, avgUnderstanding: 79, churnRiskAvg: 33, sessionsLast30d: 21 },
    { teacher: { id: 9004, name: "Daniel Foster",    email: "daniel@demo.app",     subject: "English Literature",    avatarUrl: null, totalClasses: 19, avgScore: 78.6 }, avgEngagement: 70, avgUnderstanding: 72, churnRiskAvg: 48, sessionsLast30d: 14 },
  ];
}

function adminStudents() {
  return DEMO_STUDENTS.map((s) => ({
    student: { id: s.id, name: s.name, email: s.email, grade: s.grade, subject: s.subject, primaryTeacherId: s.primaryTeacherId, avatarUrl: s.avatarUrl },
    avgEngagement: Math.max(50, 100 - s.churn.risk),
    avgUnderstanding: Math.max(55, 95 - s.churn.risk),
    churnRiskScore: s.churn.risk,
    lastSessionAt: isoDaysFromNow(-Math.floor(s.churn.risk / 25)),
  }));
}

function adminRetention() {
  const counts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  for (const s of DEMO_STUDENTS) counts[s.churn.label as keyof typeof counts]++;
  const atRisk = counts.High + counts.Critical;
  return {
    totalStudents: DEMO_STUDENTS.length,
    atRisk,
    churned30d: 0,
    retainedRate: 1 - atRisk / DEMO_STUDENTS.length,
    riskBuckets: [
      { label: "Low",      count: counts.Low },
      { label: "Medium",   count: counts.Medium },
      { label: "High",     count: counts.High },
      { label: "Critical", count: counts.Critical },
    ],
  };
}

function churnAlerts() {
  return DEMO_STUDENTS
    .filter((s) => s.churn.risk >= 40)
    .sort((a, b) => b.churn.risk - a.churn.risk)
    .map((s) => ({
      student: { id: s.id, name: s.name, email: s.email, grade: s.grade, subject: s.subject, primaryTeacherId: s.primaryTeacherId, avatarUrl: s.avatarUrl },
      prediction: churnFor(s.id)!,
    }));
}

function dashboardStats() {
  return {
    totalClasses: 42,
    totalClassesChange: 12.5,
    avgAiScore: 84,
    avgAiScoreChange: 3.2,
    avgEngagement: 81,
    avgEngagementChange: 5.8,
    weeklyRating: 4.8,
    weeklyRatingChange: 0.4,
    upcomingCount: 5,
    completedCount: 35,
    reportsCount: DEMO_REPORTS.length,
  };
}

function weeklyPerformance() {
  return [
    { day: "Sun", score: 82, engagement: 78, classes: 2 },
    { day: "Mon", score: 85, engagement: 80, classes: 4 },
    { day: "Tue", score: 88, engagement: 85, classes: 3 },
    { day: "Wed", score: 86, engagement: 82, classes: 5 },
    { day: "Thu", score: 91, engagement: 87, classes: 4 },
    { day: "Fri", score: 89, engagement: 84, classes: 3 },
    { day: "Sat", score: 84, engagement: 80, classes: 2 },
  ];
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

function paginatedClasses(query: URLSearchParams) {
  const page = Math.max(1, parseInt(query.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.get("limit") ?? "12", 10) || 12));
  const status = query.get("status");
  const q = (query.get("q") ?? "").trim().toLowerCase();

  let filtered = DEMO_CLASSES;
  if (status) filtered = filtered.filter((c) => c.status === status);
  if (q) filtered = filtered.filter((c) => c.studentName.toLowerCase().includes(q));

  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);
  return {
    items,
    total: filtered.length,
    page,
    limit,
    hasMore: page * limit < filtered.length,
  };
}

/**
 * Demo dispatcher — matches an inbound request and returns the canned response.
 * Returning `null` lets the request fall through to the real network
 * (we don't currently use that — demo mode handles every endpoint).
 */
export function getDemoResponse(method: string, fullUrl: string, body?: unknown): unknown | null {
  // Pull pathname + query out of whatever URL form arrives.
  let path = fullUrl;
  let query = new URLSearchParams();
  const queryIdx = fullUrl.indexOf("?");
  if (queryIdx !== -1) {
    path = fullUrl.slice(0, queryIdx);
    query = new URLSearchParams(fullUrl.slice(queryIdx + 1));
  }
  // Normalize — strip protocol/host if absolute, ensure leading slash.
  try {
    const u = new URL(fullUrl, "http://x");
    path = u.pathname;
    query = u.searchParams;
  } catch {
    /* not absolute, keep what we parsed */
  }

  // Match on (method, path). Paths come through as `/api/...`.
  const M = method.toUpperCase();
  const eq = (p: string) => path === p;
  const match = (re: RegExp) => re.exec(path);

  // ── Auth / picker ──
  if (M === "GET" && eq("/api/healthz")) return { status: "ok" };
  if (M === "GET" && eq("/api/teachers/select")) {
    // Picker uses real list — not used in demo mode (we bypass select),
    // but return at least the demo teacher so the picker isn't empty if
    // demo flag survives the picker rehydration.
    return [{ id: DEMO_TEACHER_ID, name: "Demo", subject: "Mathematics & Science", avatarUrl: null, totalClasses: 42 }];
  }
  if (M === "POST" && eq("/api/auth/select-teacher")) {
    return { token: DEMO_TOKEN, teacher: DEMO_TEACHER };
  }
  if (M === "POST" && eq("/api/auth/logout")) return { message: "Logged out successfully" };
  if (M === "GET" && eq("/api/auth/me")) return DEMO_TEACHER;

  // ── Classes ──
  if (M === "GET" && eq("/api/classes")) return paginatedClasses(query);
  let m = match(/^\/api\/classes\/(\d+)$/);
  if (M === "GET" && m) {
    const id = parseInt(m[1], 10);
    return DEMO_CLASSES.find((c) => c.id === id) ?? null;
  }

  // ── Sessions ──
  if (M === "POST" && eq("/api/sessions/start")) {
    const classId = (body as { classId?: number } | undefined)?.classId ?? DEMO_CLASSES[0].id;
    activeDemoSession = {
      id: 999,
      classId,
      teacherId: DEMO_TEACHER_ID,
      startedAt: new Date().toISOString(),
      status: "active",
    };
    return activeDemoSession;
  }
  if (M === "POST" && eq("/api/sessions/start-custom")) {
    const b = (body as {
      studentName?: string;
      subject?: string;
      durationMinutes?: number;
      grade?: string;
      platform?: "zoom" | "google_meet" | "teams";
    } | undefined) ?? {};
    const newClassId = 9000 + Math.floor(Math.random() * 1000);
    const cls: (typeof DEMO_CLASSES)[number] = {
      id: newClassId,
      teacherId: DEMO_TEACHER_ID,
      studentId: 0,
      studentName: b.studentName ?? "Demo Student",
      subject: b.subject ?? "Custom Subject",
      scheduledAt: new Date().toISOString(),
      durationMinutes: b.durationMinutes ?? 60,
      platform: b.platform ?? "zoom",
      meetingUrl: null,
      status: "in_progress",
      grade: b.grade ?? "",
      notes: null,
    };
    DEMO_CLASSES.unshift(cls);
    activeDemoSession = {
      id: 990 + DEMO_CLASSES.length,
      classId: newClassId,
      teacherId: DEMO_TEACHER_ID,
      startedAt: new Date().toISOString(),
      status: "active",
    };
    return { session: activeDemoSession, class: cls };
  }
  if (M === "GET" && eq("/api/sessions/active")) {
    if (!activeDemoSession) return { session: null, class: null };
    const cls = DEMO_CLASSES.find((c) => c.id === activeDemoSession!.classId) ?? DEMO_CLASSES[0];
    return { session: activeDemoSession, class: cls };
  }
  m = match(/^\/api\/sessions\/(\d+)\/finish$/);
  if (M === "POST" && m) {
    activeDemoSession = null;
    // Return the freshest demo report so /reports/:id has something to show.
    return DEMO_REPORTS[0];
  }
  m = match(/^\/api\/sessions\/(\d+)\/transcript$/);
  if (M === "POST" && m) {
    return { id: Math.floor(Math.random() * 1000), sessionId: parseInt(m[1], 10), speaker: (body as { speaker?: string })?.speaker ?? "teacher", text: (body as { text?: string })?.text ?? "", capturedAt: new Date().toISOString() };
  }
  m = match(/^\/api\/sessions\/(\d+)\/quiz-event$/);
  if (M === "POST" && m) {
    return { id: Math.floor(Math.random() * 1000), sessionId: parseInt(m[1], 10), studentId: (body as { studentId?: number })?.studentId ?? 101, question: (body as { question?: string })?.question ?? "", answer: (body as { answer?: string })?.answer ?? "", correct: (body as { correct?: boolean })?.correct ?? true, responseSeconds: null, createdAt: new Date().toISOString() };
  }

  // ── Reports ──
  if (M === "GET" && eq("/api/reports")) return DEMO_REPORTS;
  m = match(/^\/api\/reports\/(\d+)$/);
  if (M === "GET" && m) {
    const id = parseInt(m[1], 10);
    return DEMO_REPORTS.find((r) => r.id === id) ?? DEMO_REPORTS[0];
  }

  // ── Dashboard ──
  if (M === "GET" && eq("/api/dashboard/stats")) return dashboardStats();
  if (M === "GET" && eq("/api/dashboard/weekly-performance")) return weeklyPerformance();

  // ── AI ──
  if (M === "POST" && eq("/api/ai/chat")) {
    const reply = "Try chunking the explanation into 90-second pieces, then ask the student to summarize back in one sentence — it surfaces confusion early.";
    return { reply };
  }
  if (M === "POST" && eq("/api/ai/confusion")) {
    return {
      confusion: 64,
      signals: ["Student paused 12s after 'why does n-1 appear'", "Teacher moved on without addressing the question", "Quiz attempt rate dipped"],
      rescueSuggestion: "Pause, re-derive the rule with a concrete example (x² → 2x), then ask the student to predict the next derivative.",
    };
  }

  // ── Students ──
  if (M === "GET" && eq("/api/students")) {
    return DEMO_STUDENTS.map(({ churn: _churn, ...s }) => s);
  }
  m = match(/^\/api\/students\/(\d+)$/);
  if (M === "GET" && m) {
    const id = parseInt(m[1], 10);
    const s = DEMO_STUDENTS.find((x) => x.id === id);
    if (!s) return null;
    const { churn: _churn, ...basic } = s;
    return {
      ...basic,
      recentReports: DEMO_REPORTS.slice(0, 2),
      churn: churnFor(id),
    };
  }
  m = match(/^\/api\/students\/(\d+)\/parent-report$/);
  if (M === "GET" && m) {
    return parentReport(parseInt(m[1], 10));
  }
  m = match(/^\/api\/students\/(\d+)\/churn$/);
  if (M === "GET" && m) {
    return churnFor(parseInt(m[1], 10));
  }

  // ── Churn ──
  if (M === "GET" && eq("/api/churn/alerts")) return churnAlerts();

  // ── Interventions ──
  m = match(/^\/api\/interventions\/(\d+)$/);
  if (M === "GET" && m) return [];
  if (M === "POST" && eq("/api/interventions")) {
    const b = body as Partial<{ sessionId: number; studentId: number; kind: string; suggestion: string }> | undefined;
    return {
      id: Math.floor(Math.random() * 1000),
      sessionId: b?.sessionId ?? null,
      studentId: b?.studentId ?? null,
      kind: b?.kind ?? "rescue",
      suggestion: b?.suggestion ?? "",
      status: "suggested",
      createdAt: new Date().toISOString(),
    };
  }

  // ── Admin ──
  if (M === "GET" && eq("/api/admin/teachers")) return adminTeachers();
  if (M === "GET" && eq("/api/admin/students")) return adminStudents();
  if (M === "GET" && eq("/api/admin/retention")) return adminRetention();

  // Unknown demo path — log once for debugging then let it fall through.
  if (typeof console !== "undefined") {
    console.warn("[demo] unhandled", M, path);
  }
  return null;
}

export function isDemoMode(): boolean {
  try {
    return localStorage.getItem("sheldon_demo_mode") === "1";
  } catch {
    return false;
  }
}

export function enableDemoMode(): void {
  localStorage.setItem("sheldon_demo_mode", "1");
  localStorage.setItem("sheldon_token", DEMO_TOKEN);
}

export function disableDemoMode(): void {
  localStorage.removeItem("sheldon_demo_mode");
}
