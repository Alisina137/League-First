import { Router, type IRouter } from "express";
import {
  getStandings,
  getMatches,
  getScorers,
  COMPETITIONS,
} from "../services/footballDataService";

const router: IRouter = Router();

router.get("/live/league-hub", async (req, res): Promise<void> => {
  const slug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : "";

  if (!slug) {
    res.status(400).json({ error: "leagueSlug is required" });
    return;
  }

  const comp = COMPETITIONS[slug];
  if (!comp) {
    res.status(404).json({
      error: "not_supported",
      message: `${slug} is not available on the free data tier. Supported: ${Object.keys(COMPETITIONS).join(", ")}`,
    });
    return;
  }

  try {
    const [standings, allMatches, scorers] = await Promise.allSettled([
      getStandings(slug),
      getMatches(slug),
      getScorers(slug),
    ]);

    const standingsData = standings.status === "fulfilled" ? standings.value : [];
    const matchesData   = allMatches.status === "fulfilled" ? allMatches.value : [];
    const scorersData   = scorers.status === "fulfilled" ? scorers.value : [];

    const recentMatches = matchesData
      .filter(m => m.status === "finished")
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      .slice(0, 10);

    const allUpcomingSorted = matchesData
      .filter(m => m.status === "upcoming")
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

    const upcomingMatches = allUpcomingSorted.slice(0, 10);
    const nextFixtureDate: string | null = allUpcomingSorted[0]?.matchDate ?? null;

    const liveMatches = matchesData.filter(m => m.status === "live");

    const hasStarted =
      recentMatches.length > 0 ||
      liveMatches.length > 0 ||
      matchesData.some(m => m.status === "finished" || m.status === "live");

    req.log.info(
      {
        league: comp.name,
        competitionCode: comp.code,
        endpoint: `/api/live/league-hub?leagueSlug=${slug}`,
        standingsRows: standingsData.length,
        liveMatches: liveMatches.length,
        upcomingMatches: upcomingMatches.length,
        recentMatches: recentMatches.length,
        topScorers: scorersData.length,
        nextFixtureDate,
        hasStarted,
      },
      "League hub data served"
    );

    res.json({
      competition: {
        slug,
        code: comp.code,
        name: comp.name,
        country: comp.country,
        emblem: comp.emblem,
      },
      standings: standingsData,
      liveMatches,
      upcomingMatches,
      recentMatches,
      scorers: scorersData,
      nextFixtureDate,
      hasStarted,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch league hub data");
    res.status(502).json({ error: "Data currently unavailable from football-data.org" });
  }
});

export default router;
