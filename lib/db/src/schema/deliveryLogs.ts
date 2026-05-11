// Audit trail for AI-report email deliveries.
//
// Every call to POST /reports/:id/send writes a row here, regardless of
// outcome (sent / skipped / failed) — so the Admin Logs page can show what
// went out, where, and why anything failed.

import { serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { sheldonSchema } from "./_schema";
import { reportsTable } from "./reports";

export const deliveryLogsTable = sheldonSchema.table("delivery_logs", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id")
    .references(() => reportsTable.id, { onDelete: "cascade" })
    .notNull(),
  channel: text("channel").notNull().default("email"), // 'email' for now; future: 'slack', 'sms'
  status: text("status").notNull(), // 'sent' | 'failed' | 'skipped'
  recipient: text("recipient"), // where the email actually went
  intendedRecipient: text("intended_recipient"), // on-record / default address, for audit if overridden
  pdfUrl: text("pdf_url"),
  errorMessage: text("error_message"),
  triggeredBy: text("triggered_by"), // teacher / admin / system identity for traceability
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export type DeliveryLog = typeof deliveryLogsTable.$inferSelect;
export type InsertDeliveryLog = typeof deliveryLogsTable.$inferInsert;
