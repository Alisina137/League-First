import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leaguesRouter from "./leagues";
import matchesRouter from "./matches";
import standingsRouter from "./standings";
import playersRouter from "./players";
import teamsRouter from "./teams";
import transfersRouter from "./transfers";
import newsRouter from "./news";
import homepageRouter from "./homepage";
import preferencesRouter from "./preferences";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leaguesRouter);
router.use(matchesRouter);
router.use(standingsRouter);
router.use(playersRouter);
router.use(teamsRouter);
router.use(transfersRouter);
router.use(newsRouter);
router.use(homepageRouter);
router.use(preferencesRouter);

export default router;
