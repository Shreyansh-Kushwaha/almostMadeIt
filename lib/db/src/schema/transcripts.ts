import { serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";
import { sheldonSchema } from "./_schema";

export const transcriptsTable = sheldonSchema.table("transcripts", {
  id: serial("id").primaryKey(),
  // Either sessionId (legacy Supabase) OR wiseSessionId (Wise session) — both nullable.
  sessionId: integer("session_id").references(() => sessionsTable.id),
  wiseSessionId: text("wise_session_id"),
  speaker: text("speaker").notNull().default("teacher"),
  text: text("text").notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
});

export const insertTranscriptSchema = createInsertSchema(transcriptsTable).omit({ id: true, capturedAt: true });
export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
export type Transcript = typeof transcriptsTable.$inferSelect;
