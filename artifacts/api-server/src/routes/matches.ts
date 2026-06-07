import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, matchesTable, teamsTable, leaguesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/matches", async (req, res): Promise<void> => {
  const leagueSlug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const allLeagues = await db.select().from(leaguesTable);
  const leagueMap = new Map(allLeagues.map(l => [l.id, l]));

  let leagueId: number | undefined;
  if (leagueSlug) {
    const found = allLeagues.find(l => l.slug === leagueSlug);
    if (found) leagueId = found.id;
  }

  const allTeams = await db.select().from(teamsTable);
  const teamMap = new Map(allTeams.map(t => [t.id, t]));

  let query = db.select().from(matchesTable);

  const conditions = [];
  if (leagueId !== undefined) conditions.push(eq(matchesTable.leagueId, leagueId));
  if (status) conditions.push(eq(matchesTable.status, status));

  const matches = conditions.length > 0
    ? await db.select().from(matchesTable).where(and(...conditions))
    : await db.select().from(matchesTable);

  const result = matches.map(m => {
    const ht = teamMap.get(m.homeTeamId);
    const at = teamMap.get(m.awayTeamId);
    const league = leagueMap.get(m.leagueId);
    return {
      id: m.id,
      homeTeam: { id: m.homeTeamId, name: ht?.name ?? "", logoUrl: ht?.logoUrl ?? "" },
      awayTeam: { id: m.awayTeamId, name: at?.name ?? "", logoUrl: at?.logoUrl ?? "" },
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      leagueId: m.leagueId,
      leagueName: league?.name ?? "",
      leagueSlug: league?.slug ?? "",
      leagueLogo: league?.logoUrl ?? "",
      status: m.status,
      minute: m.minute,
      matchDate: m.matchDate.toISOString(),
      matchweek: m.matchweek,
      venue: m.venue,
    };
  });

  res.json(result);
});

router.get("/matches/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  const [[homeTeam], [awayTeam], [league]] = await Promise.all([
    db.select().from(teamsTable).where(eq(teamsTable.id, match.homeTeamId)),
    db.select().from(teamsTable).where(eq(teamsTable.id, match.awayTeamId)),
    db.select().from(leaguesTable).where(eq(leaguesTable.id, match.leagueId)),
  ]);

  res.json({
    id: match.id,
    homeTeam: { id: match.homeTeamId, name: homeTeam?.name ?? "", logoUrl: homeTeam?.logoUrl ?? "" },
    awayTeam: { id: match.awayTeamId, name: awayTeam?.name ?? "", logoUrl: awayTeam?.logoUrl ?? "" },
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    leagueId: match.leagueId,
    leagueName: league?.name ?? "",
    leagueSlug: league?.slug ?? "",
    leagueLogo: league?.logoUrl ?? "",
    status: match.status,
    minute: match.minute,
    matchDate: match.matchDate.toISOString(),
    matchweek: match.matchweek,
    venue: match.venue,
  });
});

export default router;
