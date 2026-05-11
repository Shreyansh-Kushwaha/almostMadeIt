import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import classesRouter from "./classes";
import sessionsRouter from "./sessions";
import reportsRouter from "./reports";
import dashboardRouter from "./dashboard";
import aiRouter from "./ai";
import studentsRouter from "./students";
import parentsRouter from "./parents";
import churnRouter from "./churn";
import interventionsRouter from "./interventions";
import transcriptsRouter from "./transcripts";
import quizRouter from "./quiz";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(classesRouter);
router.use(sessionsRouter);
router.use(reportsRouter);
router.use(dashboardRouter);
router.use(aiRouter);
// ClassPulse AI extensions
router.use(studentsRouter);
router.use(parentsRouter);
router.use(churnRouter);
router.use(interventionsRouter);
router.use(transcriptsRouter);
router.use(quizRouter);
router.use(adminRouter);

export default router;
