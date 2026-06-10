import { Router, type IRouter } from "express";
import { getMatches, getAllLiveMatches, getAllUpcomingMatches, COMPETITIONS } from "../services/footballDataService";

const router: IRouter = Router();

router.get("/live/matches", async (req, res): Promise<void> => {
  const slug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  try {
    if (!slug) {
      if (status === "live") {
        const matches = await getAllLiveMatches();
        res.json(matches);
      } else if (status === "upcoming") {
        const matches = await getAllUpcomingMatches();
        res.json(matches);
      } else {
        const [live, upcoming] = await Promise.all([getAllLiveMatches(), getAllUpcomingMatches()]);
        res.json([...live, ...upcoming]);
      }
      return;
    }

    if (!COMPETITIONS[slug]) {
      res.status(400).json({ error: "Unknown league slug" });
      return;
    }

    const apiStatus = status === "live"
      ? "LIVE"
      : status === "upcoming"
      ? "SCHEDULED"
      : status === "finished"
      ? "FINISHED"
      : undefined;

    const matches = await getMatches(slug, apiStatus);
    res.json(matches);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch matches");
    res.status(502).json({ error: "Data currently unavailable" });
  }
});

export default router;
