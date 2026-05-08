import { Router, type IRouter } from "express";
import { GoogleGenAI } from "@google/genai";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function createClient() {
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "", baseUrl },
  });
}

const FALLBACKS = [
  "That's a great question! Try breaking this concept into smaller steps. Ask the student what specific part is confusing — that usually reveals the exact gap.",
  "Based on your session, I suggest using a concrete real-world analogy here. Relatable examples make abstract concepts stick much faster.",
  "This is a common sticking point. Ask the student to explain it back to you in their own words — their explanation will show you exactly where understanding breaks down.",
  "Consider drawing a diagram or writing it out visually on screen. For many students, seeing the structure makes everything click.",
  "Great teaching instinct! You might also try connecting this to something the student already knows well — bridging from familiar to unfamiliar is very effective.",
];

router.post("/ai/chat", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const { message, transcript, subject } = req.body as {
    message: string;
    transcript?: string;
    subject?: string;
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const client = createClient();
  if (!client) {
    res.json({ reply: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] });
    return;
  }

  const systemContext = [
    `You are Sheldon AI, a real-time teaching assistant helping ${authReq.teacher.name} during a live ${subject ?? "class"} session.`,
    "Be concise, practical, and encouraging. Max 3 sentences unless the question needs more detail.",
    "Give specific, actionable advice — not generic platitudes.",
    transcript
      ? `Recent conversation transcript:\n${transcript.slice(-1500)}\n`
      : "",
    "Now answer the teacher's question:",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemContext}\n\n${message}`,
      config: { maxOutputTokens: 8192 },
    });

    const reply = response.text?.trim() ?? FALLBACKS[0];
    res.json({ reply });
  } catch (err) {
    req.log.error({ err }, "AI chat generation failed");
    res.json({ reply: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] });
  }
});

export default router;
