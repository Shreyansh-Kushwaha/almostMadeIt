import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";

function createClient() {
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "", baseUrl },
  });
}

function generateSimulatedReport(studentName: string, subject: string, teacherName: string) {
  const overallScore = 75 + Math.random() * 20;
  const engagementScore = 70 + Math.random() * 25;
  const voiceClarityScore = 72 + Math.random() * 22;
  const interactionScore = 68 + Math.random() * 27;
  const noiseLevel = 10 + Math.random() * 25;
  const speakingConfidence = 75 + Math.random() * 20;
  const deadAirSeconds = 20 + Math.random() * 80;
  const internetStability = 80 + Math.random() * 18;

  const timelineData = Array.from({ length: 10 }, (_, i) => ({
    minute: (i + 1) * 5,
    engagement: 65 + Math.random() * 30,
    voiceClarity: 68 + Math.random() * 28,
    noise: 8 + Math.random() * 22,
  }));

  return {
    overallScore: Math.round(overallScore * 10) / 10,
    engagementScore: Math.round(engagementScore * 10) / 10,
    voiceClarityScore: Math.round(voiceClarityScore * 10) / 10,
    interactionScore: Math.round(interactionScore * 10) / 10,
    noiseLevel: Math.round(noiseLevel * 10) / 10,
    speakingConfidence: Math.round(speakingConfidence * 10) / 10,
    deadAirSeconds: Math.round(deadAirSeconds),
    internetStability: Math.round(internetStability * 10) / 10,
    aiSummary: `${teacherName} demonstrated strong pedagogical skills during the ${subject} session with ${studentName}. The lesson showed clear structure and good engagement techniques. Voice delivery was confident and clear throughout most of the session. Student interaction was encouraged appropriately, and the pacing allowed for adequate comprehension time.`,
    suggestions: [
      "Reduce silent pauses between topic transitions to maintain student engagement momentum",
      "Incorporate more open-ended questions to stimulate critical thinking",
      "Use more visual aids or screen sharing to reinforce verbal explanations",
      "Consider periodic comprehension checks every 10-15 minutes",
    ],
    highlights: [
      "Excellent voice clarity and projection throughout the session",
      "Strong subject matter expertise evident in explanations",
      "Good use of examples to illustrate complex concepts",
      "Responsive to student questions with clear, thorough answers",
    ],
    improvementAreas: [
      "Reduce background noise during lesson delivery",
      "Minimize dead air time between topic transitions",
      "Increase student interaction frequency in the first half of lessons",
    ],
    timelineData,
  };
}

export async function generateAiReport(studentName: string, subject: string, teacherName: string) {
  const client = createClient();
  if (!client) {
    logger.warn("Gemini AI not configured, using simulated report");
    return generateSimulatedReport(studentName, subject, teacherName);
  }

  try {
    const prompt = `You are an AI teaching performance analyzer. Generate a detailed teaching performance analysis report for the following session:

Teacher: ${teacherName}
Student: ${studentName}
Subject: ${subject}

Respond ONLY with valid JSON (no markdown, no code fences) in exactly this structure:
{
  "aiSummary": "2-3 sentence professional summary of the teaching session",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4"],
  "highlights": ["highlight 1", "highlight 2", "highlight 3", "highlight 4"],
  "improvementAreas": ["area 1", "area 2", "area 3"]
}`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { maxOutputTokens: 8192 },
    });

    const text = response.text ?? "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      aiSummary: string;
      suggestions: string[];
      highlights: string[];
      improvementAreas: string[];
    };

    const simulated = generateSimulatedReport(studentName, subject, teacherName);
    return {
      ...simulated,
      aiSummary: parsed.aiSummary ?? simulated.aiSummary,
      suggestions: parsed.suggestions ?? simulated.suggestions,
      highlights: parsed.highlights ?? simulated.highlights,
      improvementAreas: parsed.improvementAreas ?? simulated.improvementAreas,
    };
  } catch (err) {
    logger.error({ err }, "Error generating AI report, using simulated data");
    return generateSimulatedReport(studentName, subject, teacherName);
  }
}
