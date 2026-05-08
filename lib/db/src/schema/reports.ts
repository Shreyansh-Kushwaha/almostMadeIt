import { pgTable, serial, integer, real, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teachersTable } from "./teachers";
import { classesTable } from "./classes";
import { sessionsTable } from "./sessions";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id),
  classId: integer("class_id").notNull().references(() => classesTable.id),
  teacherId: integer("teacher_id").notNull().references(() => teachersTable.id),
  overallScore: real("overall_score").notNull(),
  engagementScore: real("engagement_score").notNull(),
  voiceClarityScore: real("voice_clarity_score").notNull(),
  interactionScore: real("interaction_score").notNull(),
  noiseLevel: real("noise_level").notNull(),
  speakingConfidence: real("speaking_confidence").notNull(),
  deadAirSeconds: real("dead_air_seconds").notNull(),
  internetStability: real("internet_stability").notNull(),
  aiSummary: text("ai_summary").notNull(),
  suggestions: jsonb("suggestions").notNull().$type<string[]>().default([]),
  highlights: jsonb("highlights").notNull().$type<string[]>().default([]),
  improvementAreas: jsonb("improvement_areas").notNull().$type<string[]>().default([]),
  timelineData: jsonb("timeline_data").notNull().$type<{ minute: number; engagement: number; voiceClarity: number; noise: number }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
