import { Router, type IRouter } from "express";
import { db, casesTable, insertCaseSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/cases", async (req, res) => {
  try {
    const cases = await db.select().from(casesTable).orderBy(casesTable.createdAt);
    const today = req.query.today === "true";
    if (today) {
      const todayStr = new Date().toISOString().split("T")[0];
      res.json(cases.filter(c => c.nextDate === todayStr));
      return;
    }
    res.json(cases);
  } catch (err) {
    req.log.error({ err }, "Failed to list cases");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cases", async (req, res) => {
  try {
    const parsed = insertCaseSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [newCase] = await db.insert(casesTable).values(parsed.data).returning();
    res.status(201).json(newCase);
  } catch (err) {
    req.log.error({ err }, "Failed to create case");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cases/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [c] = await db.select().from(casesTable).where(eq(casesTable.id, id));
    if (!c) { res.status(404).json({ error: "Case not found" }); return; }
    res.json(c);
  } catch (err) {
    req.log.error({ err }, "Failed to get case");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/cases/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parsed = insertCaseSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [updatedCase] = await db.update(casesTable).set(parsed.data).where(eq(casesTable.id, id)).returning();
    if (!updatedCase) { res.status(404).json({ error: "Case not found" }); return; }
    res.json(updatedCase);
  } catch (err) {
    req.log.error({ err }, "Failed to update case");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/cases/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(casesTable).where(eq(casesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete case");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
