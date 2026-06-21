import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const DELHI_COURTS = [
  "Tis Hazari",
  "Patiala House",
  "Saket",
  "Rohini",
  "Dwarka",
  "Karkardooma",
  "Delhi High Court",
  "Supreme Court of India",
  "Other",
] as const;

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  caseTitle: text("case_title").notNull(),
  caseNumber: text("case_number").notNull(),
  courtName: text("court_name").notNull(),
  courtRoomNo: text("court_room_no"),
  judgeName: text("judge_name"),
  nextDate: text("next_date"),
  status: text("status", { enum: ["Active", "Pending", "Disposed", "Adjourned"] }).notNull().default("Pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCaseSchema = createInsertSchema(casesTable).omit({ id: true, createdAt: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof casesTable.$inferSelect;
