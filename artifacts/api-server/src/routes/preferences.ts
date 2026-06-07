import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, preferencesTable } from "@workspace/db";

const router: IRouter = Router();

const DEFAULT_SESSION_ID = "default";

router.get("/preferences", async (_req, res): Promise<void> => {
  const [pref] = await db.select().from(preferencesTable).where(eq(preferencesTable.sessionId, DEFAULT_SESSION_ID));
  if (!pref) {
    res.json({ favoriteLeagueSlugs: [], favoriteTeamIds: [], favoritePlayerIds: [] });
    return;
  }
  res.json({
    favoriteLeagueSlugs: pref.favoriteLeagueSlugs ?? [],
    favoriteTeamIds: (pref.favoriteTeamIds ?? []).map(Number),
    favoritePlayerIds: (pref.favoritePlayerIds ?? []).map(Number),
  });
});

router.put("/preferences", async (req, res): Promise<void> => {
  const body = req.body;
  const favoriteLeagueSlugs: string[] = Array.isArray(body.favoriteLeagueSlugs) ? body.favoriteLeagueSlugs : [];
  const favoriteTeamIds: string[] = Array.isArray(body.favoriteTeamIds) ? body.favoriteTeamIds.map(String) : [];
  const favoritePlayerIds: string[] = Array.isArray(body.favoritePlayerIds) ? body.favoritePlayerIds.map(String) : [];

  const [existing] = await db.select().from(preferencesTable).where(eq(preferencesTable.sessionId, DEFAULT_SESSION_ID));

  if (existing) {
    await db.update(preferencesTable)
      .set({ favoriteLeagueSlugs, favoriteTeamIds, favoritePlayerIds })
      .where(eq(preferencesTable.sessionId, DEFAULT_SESSION_ID));
  } else {
    await db.insert(preferencesTable).values({
      sessionId: DEFAULT_SESSION_ID,
      favoriteLeagueSlugs,
      favoriteTeamIds,
      favoritePlayerIds,
    });
  }

  res.json({
    favoriteLeagueSlugs,
    favoriteTeamIds: favoriteTeamIds.map(Number),
    favoritePlayerIds: favoritePlayerIds.map(Number),
  });
});

export default router;
