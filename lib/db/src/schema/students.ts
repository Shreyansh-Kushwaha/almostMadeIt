import { serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teachersTable } from "./teachers";
import { sheldonSchema } from "./_schema";

export const studentsTable = sheldonSchema.table("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  grade: text("grade"),
  subject: text("subject"),
  primaryTeacherId: integer("primary_teacher_id").references(() => teachersTable.id),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
