import { serial, integer, real, jsonb, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { sheldonSchema } from "./_schema";

export const churnPredictionsTable = sheldonSchema.table("churn_predictions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => studentsTable.id),
  wiseStudentId: text("wise_student_id"),
  riskScore: real("risk_score").notNull(),
  reasons: jsonb("reasons").notNull().$type<string[]>().default([]),
  signals: jsonb("signals").notNull().$type<{ name: string; value: number }[]>().default([]),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
});

export const insertChurnPredictionSchema = createInsertSchema(churnPredictionsTable).omit({ id: true, computedAt: true });
export type InsertChurnPrediction = z.infer<typeof insertChurnPredictionSchema>;
export type ChurnPrediction = typeof churnPredictionsTable.$inferSelect;
