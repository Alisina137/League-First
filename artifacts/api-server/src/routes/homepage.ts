import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, matchesTable, teamsTable, leaguesTable, transfersTable, newsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/homepage", async (_req, res): Promise<void> => {
  const [allLeagues, allTeams, allMatches, allTransfers, allNews] = await Promise.all([
    db.select().from(leaguesTable).orderBy(leaguesTable.id),
    db.select().from(teamsTable),
    db.select().from(matchesTable),
    db.select().from(transfersTable),
    db.select().from(newsTable),
  ]);

  const teamMap = new Map(allTeams.map(t => [t.id, t]));
  const leagueMap = new Map(allLeagues.map(l => [l.id, l]));

  const formatMatch = (m: typeof allMatches[0]) => {
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
  };

  const liveMatches = allMatches.filter(m => m.status === "live").map(formatMatch);
  const upcomingMatches = allMatches.filter(m => m.status === "upcoming").slice(0, 15).map(formatMatch);

  const featuredLeagues = allLeagues.map(l => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    country: l.country,
    logoUrl: l.logoUrl,
    currentSeason: l.currentSeason,
    currentMatchweek: l.currentMatchweek,
  }));

  const topNews = allNews.slice(0, 20).map(n => {
    const league = leagueMap.get(n.leagueId);
    return {
      id: n.id,
      title: n.title,
      excerpt: n.excerpt,
      imageUrl: n.imageUrl,
      publishedAt: n.publishedAt.toISOString(),
      source: n.source,
      leagueSlug: league?.slug ?? "",
      leagueName: league?.name ?? "",
      category: n.category,
      url: n.url,
    };
  });

  const transfers = allTransfers.slice(0, 20).map(t => {
    const league = leagueMap.get(t.leagueId);
    return {
      id: t.id,
      playerName: t.playerName,
      playerPhoto: t.playerPhoto,
      fromTeam: t.fromTeam,
      fromTeamLogo: t.fromTeamLogo,
      toTeam: t.toTeam,
      toTeamLogo: t.toTeamLogo,
      fee: t.fee,
      transferDate: t.transferDate,
      leagueSlug: league?.slug ?? "",
      leagueName: league?.name ?? "",
      type: t.type,
    };
  });

  res.json({ liveMatches, upcomingMatches, featuredLeagues, topNews, transfers });
});

export default router;
