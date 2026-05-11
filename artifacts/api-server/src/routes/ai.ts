import { Router, type IRouter } from "express";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { chatAssist, detectConfusion } from "../lib/azure-openai";

const router: IRouter = Router();

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

  const reply = await chatAssist({
    teacherName: authReq.teacher.name,
    subject,
    message,
    transcript,
  });
  res.json({ reply });
});

router.post("/ai/confusion", requireAuth, async (req, res): Promise<void> => {
  const { transcript } = req.body as { transcript?: string };
  const signal = await detectConfusion(transcript ?? "");
  res.json(signal);
});

export default router;
