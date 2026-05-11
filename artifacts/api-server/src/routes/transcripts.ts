import { Router, type IRouter } from "express";
import { db, transcriptsTable, sessionsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

const AppendTranscriptBody = z.object({
  speaker: z.enum(["teacher", "student", "system"]),
  text: z.string().min(1),
});

router.post("/sessions/:sessionId/transcript", requireAuth, async (req, res): Promise<void> => {
  const authReq = req as AuthRequest;
  const sessionId = parseInt(String(req.params.sessionId), 10);
  if (!Number.isFinite(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }
  const parsed = AppendTranscriptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  // Session ownership check supports both Supabase int teacher and Wise teacher.
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.id, sessionId),
        or(
          eq(sessionsTable.teacherId, authReq.teacher.id),
          authReq.teacher.wiseTeacherId
            ? eq(sessionsTable.wiseTeacherId, authReq.teacher.wiseTeacherId)
            : undefined,
        )!,
      ),
    );
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [row] = await db
    .insert(transcriptsTable)
    .values({
      sessionId,
      // Mirror onto the Wise key so we can find utterances by Wise session id
      // even after the Supabase int session is gone or remapped.
      wiseSessionId: session.wiseSessionId ?? null,
      speaker: parsed.data.speaker,
      text: parsed.data.text,
    })
    .returning();
  res.status(201).json({
    id: row.id,
    sessionId: row.sessionId,
    speaker: row.speaker,
    text: row.text,
    capturedAt: row.capturedAt.toISOString(),
  });
});

export default router;
