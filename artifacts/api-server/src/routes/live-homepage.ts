import { Router, type IRouter } from "express";
import { getAllLiveMatches, getAllUpcomingMatches, getStandings, COMPETITIONS } from "../services/footballDataService";

const router: IRouter = Router();

router.get("/live/homepage", async (_req, res): Promise<void> => {
  try {
    const [liveResult, upcomingResult, plStandingsResult] = await Promise.allSettled([
      getAllLiveMatches(),
      getAllUpcomingMatches(),
      getStandings("premier-league"),
    ]);

    const liveMatches   = liveResult.status    === "fulfilled" ? liveResult.value    : [];
    const allUpcoming   = upcomingResult.status === "fulfilled" ? upcomingResult.value : [];
    const plStandings   = plStandingsResult.status === "fulfilled" ? plStandingsResult.value : [];

    // Sort by date, earliest first
    const sortedUpcoming = [...allUpcoming].sort(
      (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    );

    const upcomingMatches = sortedUpcoming.slice(0, 20);
    const nextFixtureDate: string | null = sortedUpcoming[0]?.matchDate ?? null;

    // hasStarted: true if there are any live or finished matches anywhere,
    // or if competitions are known (major leagues are always "in progress" across the calendar year)
    const hasStarted =
      liveMatches.length > 0 ||
      allUpcoming.some(m => m.status === "finished") ||
      Object.keys(COMPETITIONS).length > 0; // at least one competition configured

    res.json({
      liveMatches,
      upcomingMatches,
      featuredStandings: plStandings.slice(0, 6),
      competitions: Object.entries(COMPETITIONS).map(([slug, c]) => ({
        slug,
        name: c.name,
        country: c.country,
        emblem: c.emblem,
        code: c.code,
      })),
      nextFixtureDate,
      hasStarted,
    });
  } catch (err) {
    res.status(502).json({ error: "Data currently unavailable" });
  }
});

export default router;
