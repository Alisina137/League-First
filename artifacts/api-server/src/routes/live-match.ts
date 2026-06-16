import { Router, type IRouter } from "express";
import { getMatches, getStandings, getScorers, COMPETITIONS, fdGetMatchLineup, fdGetH2H, afGetMatchLineup, afGetH2H } from "../services/footballDataService";
import type { LiveMatch } from "../services/footballDataService";

const AF_PRIMARY_SLUGS = new Set(["europa-league", "saudi-pro-league", "mls"]);

const router: IRouter = Router();

router.get("/live/match/:matchId", async (req, res): Promise<void> => {
  const matchId = parseInt(req.params.matchId, 10);
  const leagueSlug = typeof req.query.league === "string" ? req.query.league.trim() : "";

  if (!matchId || isNaN(matchId)) {
    res.status(400).json({ error: "Invalid matchId" });
    return;
  }
  if (!leagueSlug || !COMPETITIONS[leagueSlug]) {
    res.status(400).json({ error: "Missing or unknown league slug. Pass ?league=<slug>" });
    return;
  }

  try {
    const isAfPrimary = AF_PRIMARY_SLUGS.has(leagueSlug);

    const [matchesResult, standingsResult, scorersResult] = await Promise.allSettled([
      getMatches(leagueSlug),
      getStandings(leagueSlug),
      getScorers(leagueSlug),
    ]);

    const allMatches: LiveMatch[] =
      matchesResult.status === "fulfilled" ? matchesResult.value : [];
    const standings =
      standingsResult.status === "fulfilled" ? standingsResult.value : [];
    const allScorers =
      scorersResult.status === "fulfilled" ? scorersResult.value : [];

    const foundMatch = allMatches.find((m) => m.id === matchId);
    if (!foundMatch) {
      res.status(404).json({ error: "Match not found in this competition" });
      return;
    }

    const homeId = foundMatch.homeTeam.id;
    const awayId = foundMatch.awayTeam.id;

    // Fetch H2H and lineups in parallel using dedicated API endpoints
    const [h2hResult, lineupResult] = await Promise.allSettled([
      isAfPrimary ? afGetH2H(homeId, awayId) : fdGetH2H(matchId),
      isAfPrimary ? afGetMatchLineup(matchId) : fdGetMatchLineup(matchId),
    ]);

    const h2h = h2hResult.status === "fulfilled" ? h2hResult.value : [];
    const lineups = lineupResult.status === "fulfilled" ? lineupResult.value : null;

    const homeStanding = standings.find((s) => s.team.id === homeId) ?? null;
    const awayStanding = standings.find((s) => s.team.id === awayId) ?? null;

    const topScorers = allScorers
      .filter((s) => s.team.id === homeId || s.team.id === awayId)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 6);

    const comp = COMPETITIONS[leagueSlug];

    req.log.info(
      { matchId, league: leagueSlug, status: foundMatch.status },
      "Match details served"
    );

    res.json({
      match: {
        ...foundMatch,
        leagueSlug,
        competition: {
          code: foundMatch.leagueCode,
          name: foundMatch.leagueName,
          emblem: foundMatch.leagueEmblem,
          country: comp?.country ?? "",
        },
      },
      standings,
      h2h,
      lineups,
      homeStanding,
      awayStanding,
      topScorers,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch match details");
    res.status(502).json({ error: "Match data currently unavailable" });
  }
});

export default router;
