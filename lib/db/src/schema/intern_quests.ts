import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const internQuestsTable = pgTable("intern_quests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  xpPoints: integer("xp_points").notNull().default(10),
  deadline: text("deadline"),
  status: text("status", { enum: ["Open", "In Progress", "Completed"] }).notNull().default("Open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInternQuestSchema = createInsertSchema(internQuestsTable).omit({ id: true, createdAt: true });
export type InsertInternQuest = z.infer<typeof insertInternQuestSchema>;
export type InternQuest = typeof internQuestsTable.$inferSelect;
