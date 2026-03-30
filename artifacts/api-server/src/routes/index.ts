import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import casesRouter from "./cases";
import tasksRouter from "./tasks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(casesRouter);
router.use(tasksRouter);

export default router;
