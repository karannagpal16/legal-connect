import { Router, type IRouter } from "express";
import { db, bookingsTable, insertBookingSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/bookings", async (req, res) => {
  try {
    const bookings = await db.select().from(bookingsTable).orderBy(bookingsTable.createdAt);
    res.json(bookings);
  } catch (err) {
    req.log.error({ err }, "Failed to list bookings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bookings", async (req, res) => {
  try {
    const parsed = insertBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [booking] = await db.insert(bookingsTable).values(parsed.data).returning();
    res.status(201).json(booking);
  } catch (err) {
    req.log.error({ err }, "Failed to create booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/bookings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const parsed = insertBookingSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [booking] = await db.update(bookingsTable).set(parsed.data).where(eq(bookingsTable.id, id)).returning();
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(booking);
  } catch (err) {
    req.log.error({ err }, "Failed to update booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/bookings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(bookingsTable).where(eq(bookingsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
