import { serial, integer, text, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";
import { studentsTable } from "./students";
import { sheldonSchema } from "./_schema";

export const quizEventsTable = sheldonSchema.table("quiz_events", {
  id: serial("id").primaryKey(),
  // Existing int FKs nullable; Wise text columns parallel them.
  sessionId: integer("session_id").references(() => sessionsTable.id),
  studentId: integer("student_id").references(() => studentsTable.id),
  wiseSessionId: text("wise_session_id"),
  wiseStudentId: text("wise_student_id"),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  correct: boolean("correct").notNull().default(false),
  responseSeconds: real("response_seconds"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuizEventSchema = createInsertSchema(quizEventsTable).omit({ id: true, createdAt: true });
export type InsertQuizEvent = z.infer<typeof insertQuizEventSchema>;
export type QuizEvent = typeof quizEventsTable.$inferSelect;
