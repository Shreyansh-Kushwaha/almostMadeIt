import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import classesRouter from "./classes";
import sessionsRouter from "./sessions";
import reportsRouter from "./reports";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(classesRouter);
router.use(sessionsRouter);
router.use(reportsRouter);
router.use(dashboardRouter);
router.use(aiRouter);

export default router;
