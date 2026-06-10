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
import liveStandingsRouter from "./live-standings";
import liveMatchesRouter from "./live-matches";
import liveScorersRouter from "./live-scorers";
import liveTeamsRouter from "./live-teams";
import liveHomepageRouter from "./live-homepage";
import liveLeagueHubRouter from "./live-league-hub";

const router: IRouter = Router();

router.use(healthRouter);
router.use(liveStandingsRouter);
router.use(liveMatchesRouter);
router.use(liveScorersRouter);
router.use(liveTeamsRouter);
router.use(liveHomepageRouter);
router.use(liveLeagueHubRouter);
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
