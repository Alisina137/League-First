import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, newsTable, leaguesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/news", async (req, res): Promise<void> => {
  const leagueSlug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : undefined;

  const allLeagues = await db.select().from(leaguesTable);
  const leagueMap = new Map(allLeagues.map(l => [l.id, l]));

  let leagueId: number | undefined;
  if (leagueSlug) {
    const found = allLeagues.find(l => l.slug === leagueSlug);
    if (found) leagueId = found.id;
  }

  const articles = leagueId !== undefined
    ? await db.select().from(newsTable).where(eq(newsTable.leagueId, leagueId))
    : await db.select().from(newsTable);

  const result = articles.map(n => {
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

  res.json(result);
});

export default router;
