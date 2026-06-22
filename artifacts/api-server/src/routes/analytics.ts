import { Router, type IRouter } from "express";
import { db, casesTable, tasksTable, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";

const router: IRouter = Router();

const SINGAPORE_GOAL = 38000000; // ₹3.8 Crore
const REVENUE_PER_CASE = 50000;   // ₹50,000 per active case
const MARKETPLACE_FEE_RATE = 0.1; // 10%

router.get("/analytics/revenue", async (req, res) => {
  try {
    const allCases = await db.select().from(casesTable);
    const allTasks = await db.select().from(tasksTable);
    const allUsers = await db.select().from(usersTable);

    const activeCases = allCases.filter(c => c.status === "Active");
    const completedTasks = allTasks.filter(t => t.status === "Completed");
    const openTasks = allTasks.filter(t => t.status === "Open");

    const totalManagedRevenue = activeCases.length * REVENUE_PER_CASE;

    const marketplaceProfit = completedTasks.reduce((sum, t) => {
      if (!t.fee) return sum;
      const feeNum = parseFloat(t.fee.replace(/[^0-9.]/g, ""));
      return sum + (isNaN(feeNum) ? 0 : feeNum * MARKETPLACE_FEE_RATE);
    }, 0);

    const totalRevenue = totalManagedRevenue + marketplaceProfit;
    const singaporeProgress = Math.min((totalRevenue / SINGAPORE_GOAL) * 100, 100);

    res.json({
      totalActiveCases: activeCases.length,
      totalManagedRevenue,
      completedProxyTasks: completedTasks.length,
      marketplaceProfit,
      singaporeGoal: SINGAPORE_GOAL,
      singaporeProgress,
      totalUsers: allUsers.length,
      openProxyTasks: openTasks.length,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compute revenue analytics");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
