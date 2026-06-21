import { Router, type IRouter } from "express";
import { db, internQuestsTable, insertInternQuestSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/intern-quests", async (req, res) => {
  try {
    const quests = await db.select().from(internQuestsTable).orderBy(internQuestsTable.createdAt);
    res.json(quests);
  } catch (err) {
    req.log.error({ err }, "Failed to list intern quests");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/intern-quests", async (req, res) => {
  try {
    const parsed = insertInternQuestSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [quest] = await db.insert(internQuestsTable).values(parsed.data).returning();
    res.status(201).json(quest);
  } catch (err) {
    req.log.error({ err }, "Failed to create intern quest");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/intern-quests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parsed = insertInternQuestSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [quest] = await db.update(internQuestsTable).set(parsed.data).where(eq(internQuestsTable.id, id)).returning();
    if (!quest) { res.status(404).json({ error: "Quest not found" }); return; }
    res.json(quest);
  } catch (err) {
    req.log.error({ err }, "Failed to update intern quest");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/intern-quests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(internQuestsTable).where(eq(internQuestsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete intern quest");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
