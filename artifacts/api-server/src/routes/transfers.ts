import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, transfersTable, leaguesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/transfers", async (req, res): Promise<void> => {
  const leagueSlug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : undefined;

  const allLeagues = await db.select().from(leaguesTable);
  const leagueMap = new Map(allLeagues.map(l => [l.id, l]));

  let leagueId: number | undefined;
  if (leagueSlug) {
    const found = allLeagues.find(l => l.slug === leagueSlug);
    if (found) leagueId = found.id;
  }

  const transfers = leagueId !== undefined
    ? await db.select().from(transfersTable).where(eq(transfersTable.leagueId, leagueId))
    : await db.select().from(transfersTable);

  const result = transfers.map(t => {
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

  res.json(result);
});

export default router;
