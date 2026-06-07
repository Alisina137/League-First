import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, playersTable, teamsTable, leaguesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/players", async (req, res): Promise<void> => {
  const leagueSlug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const stat = typeof req.query.stat === "string" ? req.query.stat : undefined;

  const allLeagues = await db.select().from(leaguesTable);
  const leagueMap = new Map(allLeagues.map(l => [l.id, l]));
  const allTeams = await db.select().from(teamsTable);
  const teamMap = new Map(allTeams.map(t => [t.id, t]));

  let leagueId: number | undefined;
  if (leagueSlug) {
    const found = allLeagues.find(l => l.slug === leagueSlug);
    if (found) leagueId = found.id;
  }

  const conditions = [];
  if (leagueId !== undefined) conditions.push(eq(playersTable.leagueId, leagueId));
  if (search) conditions.push(ilike(playersTable.name, `%${search}%`));

  const players = conditions.length > 0
    ? await db.select().from(playersTable).where(and(...conditions))
    : await db.select().from(playersTable);

  let sorted = [...players];
  if (stat === "goals") sorted.sort((a, b) => b.goals - a.goals);
  else if (stat === "assists") sorted.sort((a, b) => b.assists - a.assists);
  else if (stat === "cleanSheets") sorted.sort((a, b) => b.cleanSheets - a.cleanSheets);

  const result = sorted.map(p => {
    const team = teamMap.get(p.teamId);
    const league = leagueMap.get(p.leagueId);
    return {
      id: p.id,
      name: p.name,
      position: p.position,
      nationality: p.nationality,
      age: p.age,
      teamId: p.teamId,
      teamName: team?.name ?? "",
      teamLogo: team?.logoUrl ?? "",
      leagueSlug: league?.slug ?? "",
      leagueName: league?.name ?? "",
      goals: p.goals,
      assists: p.assists,
      cleanSheets: p.cleanSheets,
      appearances: p.appearances,
      photoUrl: p.photoUrl,
      injured: p.injured,
    };
  });

  res.json(result);
});

router.get("/players/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  const [[team], [league]] = await Promise.all([
    db.select().from(teamsTable).where(eq(teamsTable.id, player.teamId)),
    db.select().from(leaguesTable).where(eq(leaguesTable.id, player.leagueId)),
  ]);

  res.json({
    id: player.id,
    name: player.name,
    position: player.position,
    nationality: player.nationality,
    age: player.age,
    teamId: player.teamId,
    teamName: team?.name ?? "",
    teamLogo: team?.logoUrl ?? "",
    leagueSlug: league?.slug ?? "",
    leagueName: league?.name ?? "",
    goals: player.goals,
    assists: player.assists,
    cleanSheets: player.cleanSheets,
    appearances: player.appearances,
    photoUrl: player.photoUrl,
    injured: player.injured,
  });
});

export default router;
