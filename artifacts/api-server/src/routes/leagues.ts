import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, leaguesTable, teamsTable, playersTable, matchesTable, standingsTable, transfersTable, newsTable, injuriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/leagues", async (_req, res): Promise<void> => {
  const leagues = await db.select().from(leaguesTable).orderBy(leaguesTable.id);
  res.json(leagues.map(l => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    country: l.country,
    logoUrl: l.logoUrl,
    currentSeason: l.currentSeason,
    currentMatchweek: l.currentMatchweek,
  })));
});

router.get("/leagues/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.slug, slug));
  if (!league) {
    res.status(404).json({ error: "League not found" });
    return;
  }
  res.json({
    id: league.id,
    name: league.name,
    slug: league.slug,
    country: league.country,
    logoUrl: league.logoUrl,
    currentSeason: league.currentSeason,
    currentMatchweek: league.currentMatchweek,
  });
});

router.get("/leagues/:slug/summary", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.slug, slug));
  if (!league) {
    res.status(404).json({ error: "League not found" });
    return;
  }

  const leagueId = league.id;

  const [
    allMatches,
    allStandings,
    allPlayers,
    allTransfers,
    allNews,
    allInjuries,
    allTeams,
  ] = await Promise.all([
    db.select().from(matchesTable).where(eq(matchesTable.leagueId, leagueId)),
    db.select().from(standingsTable).where(eq(standingsTable.leagueId, leagueId)).orderBy(standingsTable.position),
    db.select().from(playersTable).where(eq(playersTable.leagueId, leagueId)),
    db.select().from(transfersTable).where(eq(transfersTable.leagueId, leagueId)),
    db.select().from(newsTable).where(eq(newsTable.leagueId, leagueId)),
    db.select().from(injuriesTable).where(eq(injuriesTable.leagueId, leagueId)),
    db.select().from(teamsTable).where(eq(teamsTable.leagueId, leagueId)),
  ]);

  const teamMap = new Map(allTeams.map(t => [t.id, t]));

  const formatMatch = (m: typeof allMatches[0]) => {
    const ht = teamMap.get(m.homeTeamId);
    const at = teamMap.get(m.awayTeamId);
    return {
      id: m.id,
      homeTeam: { id: m.homeTeamId, name: ht?.name ?? "", logoUrl: ht?.logoUrl ?? "" },
      awayTeam: { id: m.awayTeamId, name: at?.name ?? "", logoUrl: at?.logoUrl ?? "" },
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      leagueId: league.id,
      leagueName: league.name,
      leagueSlug: league.slug,
      leagueLogo: league.logoUrl,
      status: m.status,
      minute: m.minute,
      matchDate: m.matchDate.toISOString(),
      matchweek: m.matchweek,
      venue: m.venue,
    };
  };

  const formatPlayer = (p: typeof allPlayers[0]) => {
    const team = teamMap.get(p.teamId);
    return {
      id: p.id,
      name: p.name,
      position: p.position,
      nationality: p.nationality,
      age: p.age,
      teamId: p.teamId,
      teamName: team?.name ?? "",
      teamLogo: team?.logoUrl ?? "",
      leagueSlug: league.slug,
      leagueName: league.name,
      goals: p.goals,
      assists: p.assists,
      cleanSheets: p.cleanSheets,
      appearances: p.appearances,
      photoUrl: p.photoUrl,
      injured: p.injured,
    };
  };

  const liveMatches = allMatches.filter(m => m.status === "live").map(formatMatch);
  const upcomingMatches = allMatches.filter(m => m.status === "upcoming").slice(0, 10).map(formatMatch);
  const recentResults = allMatches.filter(m => m.status === "finished").slice(-10).reverse().map(formatMatch);

  const standings = allStandings.map(s => {
    const team = teamMap.get(s.teamId);
    return {
      position: s.position,
      team: { id: s.teamId, name: team?.name ?? "", logoUrl: team?.logoUrl ?? "" },
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDifference: s.goalDifference,
      points: s.points,
      form: s.form,
      leagueSlug: league.slug,
    };
  });

  const topScorers = [...allPlayers].sort((a, b) => b.goals - a.goals).slice(0, 10).map(formatPlayer);
  const topAssists = [...allPlayers].sort((a, b) => b.assists - a.assists).slice(0, 10).map(formatPlayer);
  const cleanSheets = allPlayers.filter(p => p.position === "GK").sort((a, b) => b.cleanSheets - a.cleanSheets).slice(0, 10).map(formatPlayer);

  const transfers = allTransfers.map(t => ({
    id: t.id,
    playerName: t.playerName,
    playerPhoto: t.playerPhoto,
    fromTeam: t.fromTeam,
    fromTeamLogo: t.fromTeamLogo,
    toTeam: t.toTeam,
    toTeamLogo: t.toTeamLogo,
    fee: t.fee,
    transferDate: t.transferDate,
    leagueSlug: league.slug,
    leagueName: league.name,
    type: t.type,
  }));

  const news = allNews.map(n => ({
    id: n.id,
    title: n.title,
    excerpt: n.excerpt,
    imageUrl: n.imageUrl,
    publishedAt: n.publishedAt.toISOString(),
    source: n.source,
    leagueSlug: league.slug,
    leagueName: league.name,
    category: n.category,
    url: n.url,
  }));

  const injuries = allInjuries.map(i => {
    const team = teamMap.get(i.teamId);
    return {
      id: i.id,
      playerName: i.playerName,
      playerPhoto: i.playerPhoto,
      teamName: team?.name ?? "",
      teamLogo: team?.logoUrl ?? "",
      leagueSlug: league.slug,
      injury: i.injury,
      expectedReturn: i.expectedReturn,
      status: i.status,
    };
  });

  res.json({
    league: {
      id: league.id,
      name: league.name,
      slug: league.slug,
      country: league.country,
      logoUrl: league.logoUrl,
      currentSeason: league.currentSeason,
      currentMatchweek: league.currentMatchweek,
    },
    liveMatches,
    upcomingMatches,
    recentResults,
    standings,
    topScorers,
    topAssists,
    cleanSheets,
    transfers,
    news,
    injuries,
  });
});

export default router;
