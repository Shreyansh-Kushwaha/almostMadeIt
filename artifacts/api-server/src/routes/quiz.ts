import { Router, type IRouter } from "express";
import { db, quizEventsTable, sessionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

const RecordQuizEventBody = z.object({
  studentId: z.number().int().nullable().optional(),
  question: z.string().min(1),
  answer: z.string().min(1),
  correct: z.boolean(),
  responseSeconds: z.number().nonnegative().nullable().optional(),
});

router.post("/sessions/:sessionId/quiz-event", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const sessionId = parseInt(String(req.params.sessionId), 10);
  if (!Number.isFinite(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }
  const parsed = RecordQuizEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.teacherId, authReq.teacher.id)));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [row] = await db
    .insert(quizEventsTable)
    .values({
      sessionId,
      studentId: parsed.data.studentId ?? null,
      question: parsed.data.question,
      answer: parsed.data.answer,
      correct: parsed.data.correct,
      responseSeconds: parsed.data.responseSeconds ?? null,
    })
    .returning();
  res.status(201).json({
    id: row.id,
    sessionId: row.sessionId,
    studentId: row.studentId,
    question: row.question,
    answer: row.answer,
    correct: row.correct,
    responseSeconds: row.responseSeconds,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
