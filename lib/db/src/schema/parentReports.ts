import { serial, integer, real, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { parentsTable } from "./parents";
import { sheldonSchema } from "./_schema";

export const parentReportsTable = sheldonSchema.table("parent_reports", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  parentId: integer("parent_id").references(() => parentsTable.id),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  engagementScore: real("engagement_score").notNull(),
  understandingScore: real("understanding_score").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  summary: text("summary").notNull(),
  strengths: jsonb("strengths").notNull().$type<string[]>().default([]),
  weakAreas: jsonb("weak_areas").notNull().$type<string[]>().default([]),
  recommendations: jsonb("recommendations").notNull().$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertParentReportSchema = createInsertSchema(parentReportsTable).omit({ id: true, createdAt: true });
export type InsertParentReport = z.infer<typeof insertParentReportSchema>;
export type ParentReport = typeof parentReportsTable.$inferSelect;
