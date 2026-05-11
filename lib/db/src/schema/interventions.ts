import { serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";
import { studentsTable } from "./students";
import { sheldonSchema } from "./_schema";

export const interventionsTable = sheldonSchema.table("interventions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessionsTable.id),
  studentId: integer("student_id").references(() => studentsTable.id),
  kind: text("kind").notNull(), // confusion | silent | low_engagement | churn_risk | rescue
  suggestion: text("suggestion").notNull(),
  status: text("status").notNull().default("suggested"), // suggested | applied | dismissed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInterventionSchema = createInsertSchema(interventionsTable).omit({ id: true, createdAt: true });
export type InsertIntervention = z.infer<typeof insertInterventionSchema>;
export type Intervention = typeof interventionsTable.$inferSelect;
