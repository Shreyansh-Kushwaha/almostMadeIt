import { serial, integer, real, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teachersTable } from "./teachers";
import { classesTable } from "./classes";
import { sessionsTable } from "./sessions";
import { sheldonSchema } from "./_schema";

export const reportsTable = sheldonSchema.table("reports", {
  id: serial("id").primaryKey(),
  // Existing int FKs — nullable so reports keyed by Wise IDs can coexist
  // with legacy Supabase-keyed reports.
  sessionId: integer("session_id").references(() => sessionsTable.id),
  classId: integer("class_id").references(() => classesTable.id),
  teacherId: integer("teacher_id").references(() => teachersTable.id),
  // Wise keys — populated for ClassPulse reports generated from Wise sessions.
  wiseSessionId: text("wise_session_id"),
  wiseTeacherId: text("wise_teacher_id"),
  wiseClassId: text("wise_class_id"),
  wiseStudentId: text("wise_student_id"),
  overallScore: real("overall_score").notNull(),
  engagementScore: real("engagement_score").notNull(),
  voiceClarityScore: real("voice_clarity_score").notNull(),
  interactionScore: real("interaction_score").notNull(),
  noiseLevel: real("noise_level").notNull(),
  speakingConfidence: real("speaking_confidence").notNull(),
  deadAirSeconds: real("dead_air_seconds").notNull(),
  internetStability: real("internet_stability").notNull(),
  // ClassPulse AI scores (optional — older reports won't have them)
  understandingScore: real("understanding_score"),
  satisfactionScore: real("satisfaction_score"),
  teacherCompatibilityScore: real("teacher_compatibility_score"),
  churnRiskScore: real("churn_risk_score"),
  aiSummary: text("ai_summary").notNull(),
  suggestions: jsonb("suggestions").notNull().$type<string[]>().default([]),
  highlights: jsonb("highlights").notNull().$type<string[]>().default([]),
  improvementAreas: jsonb("improvement_areas").notNull().$type<string[]>().default([]),
  timelineData: jsonb("timeline_data").notNull().$type<{ minute: number; engagement: number; voiceClarity: number; noise: number }[]>().default([]),
  // ClassPulse mood timeline: per-minute emotional energy + valence (-1..1)
  moodTimeline: jsonb("mood_timeline").$type<{ minute: number; mood: string; valence: number; energy: number }[]>().default([]),
  // Confusion radar timeline: per-minute confusion intensity
  confusionTimeline: jsonb("confusion_timeline").$type<{ minute: number; confusion: number }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
