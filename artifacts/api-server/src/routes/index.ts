import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pollsRouter from "./polls";
import predictionsRouter from "./predictions";
import profilesRouter from "./profiles";
import categoriesRouter from "./categories";
import applyRouter from "./apply";
import newsletterRouter from "./newsletter";
import adminRouter from "./admin";
import cmsRouter from "./cms";
import majlisRouter from "./majlis";
import ideationRouter from "./ideation";
import chatbotRouter from "./chatbot";
import ogImageRouter from "./og-image";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pollsRouter);
router.use("/predictions", predictionsRouter);
router.use(profilesRouter);
router.use(categoriesRouter);
router.use(applyRouter);
router.use(newsletterRouter);
router.use(adminRouter);
router.use(cmsRouter);
router.use(majlisRouter);
router.use(ideationRouter);
router.use(chatbotRouter);
router.use(ogImageRouter);

export default router;
