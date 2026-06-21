import { z } from "zod";

export const caseSchema = z.object({
  caseTitle: z.string().min(1, "Case title is required"),
  caseNumber: z.string().min(1, "Case number is required"),
  courtName: z.string().min(1, "Court name is required"),
  nextDate: z.string().optional().nullable(),
  status: z.enum(["Active", "Pending", "Closed", "Adjourned"]),
});

export type CaseFormValues = z.infer<typeof caseSchema>;

export const taskSchema = z.object({
  taskDescription: z.string().min(1, "Task description is required"),
  fee: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.enum(["Pending", "In Progress", "Completed", "Cancelled"]),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  barId: z.string().optional().nullable(),
  email: z.string().email("Invalid email address"),
  role: z.enum(["Admin", "Advocate", "Intern"]),
});

export type UserFormValues = z.infer<typeof userSchema>;
