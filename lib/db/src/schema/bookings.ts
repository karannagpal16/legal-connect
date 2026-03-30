import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone").notNull(),
  legalIssueType: text("legal_issue_type", {
    enum: ["Criminal", "Civil", "Family", "Property", "Corporate", "Labour", "Other"],
  }).notNull(),
  preferredLawyer: text("preferred_lawyer"),
  preferredDate: text("preferred_date").notNull(),
  preferredTime: text("preferred_time", {
    enum: ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"],
  }).notNull(),
  briefDescription: text("brief_description"),
  status: text("status", {
    enum: ["Pending", "Confirmed", "Cancelled", "Completed"],
  }).notNull().default("Pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
