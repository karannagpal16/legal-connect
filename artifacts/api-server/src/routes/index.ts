import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import casesRouter from "./cases";
import tasksRouter from "./tasks";
import internQuestsRouter from "./intern_quests";
import analyticsRouter from "./analytics";
import bookingsRouter from "./bookings";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(casesRouter);
router.use(tasksRouter);
router.use(internQuestsRouter);
router.use(analyticsRouter);
router.use(bookingsRouter);
router.use(aiRouter);

export default router;
