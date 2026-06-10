import { Router, type IRouter } from "express";
import { getAllLiveMatches, getAllUpcomingMatches, getStandings, COMPETITIONS } from "../services/footballDataService";

const router: IRouter = Router();

router.get("/live/homepage", async (_req, res): Promise<void> => {
  try {
    const [liveMatches, upcomingMatches, plStandings] = await Promise.allSettled([
      getAllLiveMatches(),
      getAllUpcomingMatches(),
      getStandings("premier-league"),
    ]);

    res.json({
      liveMatches: liveMatches.status === "fulfilled" ? liveMatches.value : [],
      upcomingMatches: upcomingMatches.status === "fulfilled" ? upcomingMatches.value.slice(0, 20) : [],
      featuredStandings: plStandings.status === "fulfilled" ? plStandings.value.slice(0, 6) : [],
      competitions: Object.entries(COMPETITIONS).map(([slug, c]) => ({
        slug,
        name: c.name,
        country: c.country,
        emblem: c.emblem,
        code: c.code,
      })),
    });
  } catch (err) {
    res.status(502).json({ error: "Data currently unavailable" });
  }
});

export default router;
