import { Router, type IRouter } from "express";
import { getMatches, getStandings, COMPETITIONS } from "../services/footballDataService";
import type { LiveMatch } from "../services/footballDataService";

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
    // All data comes from cached provider calls — no extra HTTP requests
    const [matchesResult, standingsResult] = await Promise.allSettled([
      getMatches(leagueSlug),
      getStandings(leagueSlug),
    ]);

    const allMatches: LiveMatch[] =
      matchesResult.status === "fulfilled" ? matchesResult.value : [];
    const standings =
      standingsResult.status === "fulfilled" ? standingsResult.value : [];

    const foundMatch = allMatches.find((m) => m.id === matchId);
    if (!foundMatch) {
      res.status(404).json({ error: "Match not found in this competition" });
      return;
    }

    const homeId = foundMatch.homeTeam.id;
    const awayId = foundMatch.awayTeam.id;

    // H2H: finished matches between these two teams in this competition
    const h2h = allMatches
      .filter(
        (m) =>
          m.id !== matchId &&
          m.status === "finished" &&
          ((m.homeTeam.id === homeId && m.awayTeam.id === awayId) ||
            (m.homeTeam.id === awayId && m.awayTeam.id === homeId))
      )
      .sort(
        (a, b) =>
          new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
      )
      .slice(0, 5);

    const homeStanding = standings.find((s) => s.team.id === homeId) ?? null;
    const awayStanding = standings.find((s) => s.team.id === awayId) ?? null;

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
      homeStanding,
      awayStanding,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch match details");
    res.status(502).json({ error: "Match data currently unavailable" });
  }
});

export default router;
