import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, standingsTable, teamsTable, leaguesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/standings", async (req, res): Promise<void> => {
  const leagueSlug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : undefined;

  if (!leagueSlug) {
    res.status(400).json({ error: "leagueSlug is required" });
    return;
  }

  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.slug, leagueSlug));
  if (!league) {
    res.json([]);
    return;
  }

  const rows = await db.select().from(standingsTable)
    .where(eq(standingsTable.leagueId, league.id))
    .orderBy(standingsTable.position);

  const teamIds = rows.map(r => r.teamId);
  const teams = teamIds.length > 0
    ? await db.select().from(teamsTable).where(eq(teamsTable.leagueId, league.id))
    : [];
  const teamMap = new Map(teams.map(t => [t.id, t]));

  const result = rows.map(s => {
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

  res.json(result);
});

export default router;
