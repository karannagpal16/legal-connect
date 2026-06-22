import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  taskDescription: text("task_description").notNull(),
  caseRef: integer("case_ref"),
  taskType: text("task_type", { enum: ["Pass-over", "Adjournment", "Evidence", "Arguments", "Other"] }),
  fee: text("fee"),
  location: text("location"),
  assignedToId: integer("assigned_to_id"),
  status: text("status", { enum: ["Open", "Accepted", "Completed", "Cancelled"] }).notNull().default("Open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
