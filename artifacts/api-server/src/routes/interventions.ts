import { Router, type IRouter } from "express";
import { db, interventionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const CreateInterventionBody = z.object({
  sessionId: z.number().int().nullable().optional(),
  studentId: z.number().int().nullable().optional(),
  kind: z.enum(["confusion", "silent", "low_engagement", "churn_risk", "rescue"]),
  suggestion: z.string().min(1),
  status: z.enum(["suggested", "applied", "dismissed"]).optional(),
});

router.get("/interventions/:sessionId", requireAuth, async (req, res): Promise<void> => {
  const sessionId = parseInt(String(req.params.sessionId), 10);
  if (!Number.isFinite(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }
  const rows = await db
    .select()
    .from(interventionsTable)
    .where(eq(interventionsTable.sessionId, sessionId))
    .orderBy(desc(interventionsTable.createdAt));
  res.json(
    rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      studentId: r.studentId,
      kind: r.kind,
      suggestion: r.suggestion,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.post("/interventions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateInterventionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid intervention" });
    return;
  }
  const [row] = await db
    .insert(interventionsTable)
    .values({
      sessionId: parsed.data.sessionId ?? null,
      studentId: parsed.data.studentId ?? null,
      kind: parsed.data.kind,
      suggestion: parsed.data.suggestion,
      status: parsed.data.status ?? "suggested",
    })
    .returning();
  res.status(201).json({
    id: row.id,
    sessionId: row.sessionId,
    studentId: row.studentId,
    kind: row.kind,
    suggestion: row.suggestion,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
