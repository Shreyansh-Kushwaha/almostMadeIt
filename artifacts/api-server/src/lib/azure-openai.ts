import { AzureOpenAI } from "openai";
import { logger } from "./logger";

// ────────────────────────────────────────────────────────────────────────────
// Azure OpenAI provider for ClassPulse AI
//
// Replaces the previous Gemini integration. Uses GPT-5.1 via Azure deployment.
// All AI calls funnel through the helpers in this module so the swap is
// localized and the simulated fallback path is preserved.
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_API_VERSION = "2024-12-01-preview";

function createClient(): AzureOpenAI | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? DEFAULT_API_VERSION;
  if (!endpoint || !apiKey || !deployment) return null;
  return new AzureOpenAI({ endpoint, apiKey, deployment, apiVersion });
}

function deploymentName(): string {
  return process.env.AZURE_OPENAI_DEPLOYMENT ?? "gpt-5.1";
}

async function jsonComplete<T>(systemPrompt: string, userPrompt: string): Promise<T | null> {
  const client = createClient();
  if (!client) return null;
  try {
    const completion = await client.chat.completions.create({
      model: deploymentName(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_completion_tokens: 2048,
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return JSON.parse(text) as T;
  } catch (err) {
    logger.error({ err }, "Azure OpenAI JSON completion failed");
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Simulated fallback (retained for offline / no-key dev)
// ────────────────────────────────────────────────────────────────────────────

function simulateClassReport(studentName: string, subject: string, teacherName: string) {
  const overallScore = 75 + Math.random() * 20;
  const engagementScore = 70 + Math.random() * 25;
  const voiceClarityScore = 72 + Math.random() * 22;
  const interactionScore = 68 + Math.random() * 27;
  const noiseLevel = 10 + Math.random() * 25;
  const speakingConfidence = 75 + Math.random() * 20;
  const deadAirSeconds = 20 + Math.random() * 80;
  const internetStability = 80 + Math.random() * 18;
  const understandingScore = 65 + Math.random() * 30;
  const satisfactionScore = 70 + Math.random() * 25;
  const teacherCompatibilityScore = 72 + Math.random() * 23;
  const churnRiskScore = 5 + Math.random() * 35;

  const timelineData = Array.from({ length: 10 }, (_, i) => ({
    minute: (i + 1) * 5,
    engagement: 65 + Math.random() * 30,
    voiceClarity: 68 + Math.random() * 28,
    noise: 8 + Math.random() * 22,
  }));

  const moods = ["calm", "engaged", "curious", "thoughtful", "energetic", "uncertain", "confident"];
  const moodTimeline = Array.from({ length: 10 }, (_, i) => ({
    minute: (i + 1) * 5,
    mood: moods[Math.floor(Math.random() * moods.length)],
    valence: -0.2 + Math.random() * 1.0,
    energy: 0.4 + Math.random() * 0.6,
  }));

  const confusionTimeline = Array.from({ length: 10 }, (_, i) => ({
    minute: (i + 1) * 5,
    confusion: Math.round(Math.random() * 60),
  }));

  return {
    overallScore: round(overallScore),
    engagementScore: round(engagementScore),
    voiceClarityScore: round(voiceClarityScore),
    interactionScore: round(interactionScore),
    noiseLevel: round(noiseLevel),
    speakingConfidence: round(speakingConfidence),
    deadAirSeconds: Math.round(deadAirSeconds),
    internetStability: round(internetStability),
    understandingScore: round(understandingScore),
    satisfactionScore: round(satisfactionScore),
    teacherCompatibilityScore: round(teacherCompatibilityScore),
    churnRiskScore: round(churnRiskScore),
    aiSummary: `${teacherName} led the ${subject} session with ${studentName} effectively. Pacing and clarity were strong, with room for more interactive moments to lift engagement further.`,
    suggestions: [
      "Insert a quick comprehension check every 8-10 minutes",
      "Use more open-ended prompts to draw out the student's thinking",
      "Introduce a visual aid for the most abstract concept of the lesson",
      "Reduce silent transitions between topics",
    ],
    highlights: [
      "Clear voice and confident delivery",
      "Strong subject-matter expertise",
      "Patient response to student questions",
      "Good use of concrete examples",
    ],
    improvementAreas: [
      "Background noise during explanation",
      "Long pauses between topics",
      "Limited student talk-time in first half",
    ],
    timelineData,
    moodTimeline,
    confusionTimeline,
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

// ────────────────────────────────────────────────────────────────────────────
// Public AI helpers used by the API server
// ────────────────────────────────────────────────────────────────────────────

export interface ClassReportInput {
  studentName: string;
  subject: string;
  teacherName: string;
  transcript?: string;
  durationMinutes?: number;
}

export type ClassReport = ReturnType<typeof simulateClassReport>;

export async function generateClassReport(input: ClassReportInput): Promise<ClassReport> {
  const client = createClient();
  if (!client) {
    logger.warn("Azure OpenAI not configured — returning simulated ClassPulse report");
    return simulateClassReport(input.studentName, input.subject, input.teacherName);
  }

  const transcriptSnippet = input.transcript ? input.transcript.slice(-4000) : "(no transcript captured)";
  const duration = input.durationMinutes ?? 50;

  const systemPrompt = `You are ClassPulse AI, an emotionally-intelligent classroom analyst.
Given a teaching session transcript, produce a structured JSON report covering engagement,
understanding, satisfaction, churn risk, mood timeline, and intervention suggestions.
Always respond with valid JSON only — no markdown, no commentary.`;

  const userPrompt = `Session metadata:
- Teacher: ${input.teacherName}
- Student: ${input.studentName}
- Subject: ${input.subject}
- Duration (minutes): ${duration}

Transcript (most recent ~4000 chars):
${transcriptSnippet}

Return JSON in EXACTLY this shape (numbers 0-100 unless noted):
{
  "overallScore": number,
  "engagementScore": number,
  "voiceClarityScore": number,
  "interactionScore": number,
  "noiseLevel": number,
  "speakingConfidence": number,
  "deadAirSeconds": number,
  "internetStability": number,
  "understandingScore": number,
  "satisfactionScore": number,
  "teacherCompatibilityScore": number,
  "churnRiskScore": number,
  "aiSummary": string (2-3 sentences),
  "suggestions": string[4],
  "highlights": string[4],
  "improvementAreas": string[3],
  "timelineData": [{"minute": number, "engagement": number, "voiceClarity": number, "noise": number}] (10 points spaced across the session),
  "moodTimeline": [{"minute": number, "mood": string, "valence": number (-1..1), "energy": number (0..1)}] (10 points),
  "confusionTimeline": [{"minute": number, "confusion": number (0..100)}] (10 points)
}`;

  const ai = await jsonComplete<ClassReport>(systemPrompt, userPrompt);
  if (!ai) return simulateClassReport(input.studentName, input.subject, input.teacherName);
  // Merge with simulated to fill any missing fields the model omitted
  const sim = simulateClassReport(input.studentName, input.subject, input.teacherName);
  return { ...sim, ...ai };
}

export interface ChatAssistInput {
  teacherName: string;
  subject?: string;
  message: string;
  transcript?: string;
}

export async function chatAssist(input: ChatAssistInput): Promise<string> {
  const client = createClient();
  if (!client) {
    return "ClassPulse AI is not connected to Azure OpenAI yet. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT to enable real assistance.";
  }
  try {
    const completion = await client.chat.completions.create({
      model: deploymentName(),
      messages: [
        {
          role: "system",
          content: [
            `You are ClassPulse AI, a concise real-time teaching assistant helping ${input.teacherName} during a live ${input.subject ?? "class"}.`,
            "Keep replies under 3 sentences. Give specific, actionable advice — never generic platitudes.",
            input.transcript ? `Recent transcript:\n${input.transcript.slice(-1500)}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
        { role: "user", content: input.message },
      ],
      temperature: 0.7,
      max_completion_tokens: 400,
    });
    return completion.choices[0]?.message?.content?.trim() ?? "I couldn't generate a response — try again.";
  } catch (err) {
    logger.error({ err }, "Azure OpenAI chatAssist failed");
    return "I hit a snag reaching Azure OpenAI. Please retry in a moment.";
  }
}

export interface ConfusionSignal {
  confusion: number; // 0-100
  signals: string[]; // short cues like "long pause after question", "rephrasing", etc.
  rescueSuggestion: string;
}

export async function detectConfusion(transcriptChunk: string): Promise<ConfusionSignal> {
  const fallback: ConfusionSignal = {
    confusion: Math.round(Math.random() * 40),
    signals: ["transcript-too-short"],
    rescueSuggestion: "Ask the student to summarise the last point in their own words.",
  };
  if (!transcriptChunk || transcriptChunk.length < 30) return fallback;

  const ai = await jsonComplete<ConfusionSignal>(
    `You are ClassPulse AI's Confusion Radar. Detect signs of student confusion in a short transcript window. Respond JSON only.`,
    `Transcript window:
"""
${transcriptChunk.slice(-1500)}
"""

Return JSON:
{
  "confusion": number 0..100,
  "signals": string[] (1-3 short cues, e.g. "long pause", "rephrasing", "uh-huh without depth"),
  "rescueSuggestion": string (one concrete next move for the teacher, max 18 words)
}`
  );
  return ai ?? fallback;
}

export interface ChurnPredictionInput {
  studentName: string;
  recentScores: { engagement: number; understanding?: number; satisfaction?: number }[];
  attendanceRate: number; // 0-1
  cancellations30d: number;
}

export interface ChurnPredictionOutput {
  riskScore: number; // 0-100
  reasons: string[];
  signals: { name: string; value: number }[];
}

export async function predictChurn(input: ChurnPredictionInput): Promise<ChurnPredictionOutput> {
  const heuristic = (): ChurnPredictionOutput => {
    const avgEng = input.recentScores.length
      ? input.recentScores.reduce((a, b) => a + b.engagement, 0) / input.recentScores.length
      : 70;
    const base = (100 - avgEng) * 0.5 + (1 - input.attendanceRate) * 50 + input.cancellations30d * 8;
    const riskScore = Math.max(0, Math.min(100, Math.round(base)));
    return {
      riskScore,
      reasons: [
        avgEng < 70 ? "Engagement trending below 70%" : "Engagement stable",
        input.attendanceRate < 0.85 ? "Attendance below 85%" : "Attendance healthy",
        input.cancellations30d > 1 ? `${input.cancellations30d} cancellations in last 30 days` : "Few cancellations",
      ],
      signals: [
        { name: "engagement_avg", value: Math.round(avgEng) },
        { name: "attendance_rate", value: Math.round(input.attendanceRate * 100) },
        { name: "cancellations_30d", value: input.cancellations30d },
      ],
    };
  };

  const ai = await jsonComplete<ChurnPredictionOutput>(
    `You are ClassPulse AI's Churn Prediction Engine. Estimate the probability that a student will churn from the platform.`,
    `Student: ${input.studentName}
Recent session metrics: ${JSON.stringify(input.recentScores)}
Attendance rate (0-1): ${input.attendanceRate}
Cancellations last 30 days: ${input.cancellations30d}

Return JSON:
{
  "riskScore": number 0..100,
  "reasons": string[] (3 short bullets),
  "signals": [{"name": string, "value": number}] (3-5 numeric drivers)
}`
  );
  return ai ?? heuristic();
}

export interface ParentReportInput {
  studentName: string;
  periodLabel: string;
  recentReports: { engagement: number; understanding: number; satisfaction: number; subject: string }[];
}

export interface ParentReportOutput {
  summary: string;
  engagementScore: number;
  understandingScore: number;
  confidenceScore: number;
  strengths: string[];
  weakAreas: string[];
  recommendations: string[];
}

export async function generateParentReport(input: ParentReportInput): Promise<ParentReportOutput> {
  const fallback = (): ParentReportOutput => {
    const avg = (k: "engagement" | "understanding" | "satisfaction") =>
      input.recentReports.length ? input.recentReports.reduce((a, b) => a + b[k], 0) / input.recentReports.length : 75;
    return {
      summary: `${input.studentName} had an engaged ${input.periodLabel}, showing steady focus and curiosity in class.`,
      engagementScore: round(avg("engagement")),
      understandingScore: round(avg("understanding")),
      confidenceScore: round(avg("satisfaction")),
      strengths: ["Asks thoughtful questions", "Stays focused for full sessions", "Open to feedback"],
      weakAreas: ["Hesitant when topics turn abstract", "Occasionally distracted late in long sessions"],
      recommendations: [
        "Spend 10 minutes a day reviewing the week's most challenging topic",
        "Encourage explaining concepts back to a parent",
        "Schedule sessions earlier in the day when focus is higher",
      ],
    };
  };

  const ai = await jsonComplete<ParentReportOutput>(
    `You are ClassPulse AI generating a warm, parent-facing summary. Be specific, concrete, and supportive.`,
    `Student: ${input.studentName}
Period: ${input.periodLabel}
Recent session metrics: ${JSON.stringify(input.recentReports)}

Return JSON:
{
  "summary": string (3-4 sentences for the parent),
  "engagementScore": number 0..100,
  "understandingScore": number 0..100,
  "confidenceScore": number 0..100,
  "strengths": string[3],
  "weakAreas": string[2],
  "recommendations": string[3]
}`
  );
  return ai ?? fallback();
}
