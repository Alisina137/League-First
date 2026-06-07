import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, teamsTable, leaguesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/teams", async (req, res): Promise<void> => {
  const leagueSlug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;

  const allLeagues = await db.select().from(leaguesTable);
  const leagueMap = new Map(allLeagues.map(l => [l.id, l]));

  let leagueId: number | undefined;
  if (leagueSlug) {
    const found = allLeagues.find(l => l.slug === leagueSlug);
    if (found) leagueId = found.id;
  }

  const conditions = [];
  if (leagueId !== undefined) conditions.push(eq(teamsTable.leagueId, leagueId));
  if (search) conditions.push(ilike(teamsTable.name, `%${search}%`));

  const teams = conditions.length > 0
    ? await db.select().from(teamsTable).where(and(...conditions))
    : await db.select().from(teamsTable);

  const result = teams.map(t => {
    const league = leagueMap.get(t.leagueId);
    return {
      id: t.id,
      name: t.name,
      logoUrl: t.logoUrl,
      leagueSlug: league?.slug ?? "",
      leagueName: league?.name ?? "",
      country: t.country,
      founded: t.founded,
      stadium: t.stadium,
      manager: t.manager,
    };
  });

  res.json(result);
});

export default router;
