import { Router, type IRouter } from "express";
import { db, tasksTable, insertTaskSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/tasks", async (req, res) => {
  try {
    const tasks = await db.select().from(tasksTable).orderBy(tasksTable.createdAt);
    res.json(tasks);
  } catch (err) {
    req.log.error({ err }, "Failed to list tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks", async (req, res) => {
  try {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [task] = await db.insert(tasksTable).values(parsed.data).returning();
    res.status(201).json(task);
  } catch (err) {
    req.log.error({ err }, "Failed to create task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    res.json(task);
  } catch (err) {
    req.log.error({ err }, "Failed to get task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks/:id/accept", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    if (task.status !== "Open") {
      res.status(400).json({ error: "Task is not open for acceptance" });
      return;
    }
    const [updated] = await db.update(tasksTable).set({ status: "Accepted" }).where(eq(tasksTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to accept task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parsed = insertTaskSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [updatedTask] = await db.update(tasksTable).set(parsed.data).where(eq(tasksTable.id, id)).returning();
    if (!updatedTask) { res.status(404).json({ error: "Task not found" }); return; }
    res.json(updatedTask);
  } catch (err) {
    req.log.error({ err }, "Failed to update task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete task");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
