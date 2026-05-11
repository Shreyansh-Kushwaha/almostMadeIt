import { serial, integer, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teachersTable } from "./teachers";
import { classesTable } from "./classes";
import { sheldonSchema } from "./_schema";

export const sessionsTable = sheldonSchema.table("sessions", {
  id: serial("id").primaryKey(),
  // Existing int FKs — nullable so a session row can be sourced from either
  // our Supabase data (legacy/custom classes) OR from a Wise upstream session.
  classId: integer("class_id").references(() => classesTable.id),
  teacherId: integer("teacher_id").references(() => teachersTable.id),
  // Wise (Mongo) keys — populated when the session is monitoring a Wise lesson.
  wiseSessionId: text("wise_session_id"),
  wiseTeacherId: text("wise_teacher_id"),
  wiseClassId: text("wise_class_id"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
