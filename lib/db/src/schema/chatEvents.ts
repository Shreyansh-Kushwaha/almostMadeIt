import { serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";
import { sheldonSchema } from "./_schema";

export const chatEventsTable = sheldonSchema.table("chat_events", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id),
  role: text("role").notNull(), // teacher | student | ai
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatEventSchema = createInsertSchema(chatEventsTable).omit({ id: true, createdAt: true });
export type InsertChatEvent = z.infer<typeof insertChatEventSchema>;
export type ChatEvent = typeof chatEventsTable.$inferSelect;
