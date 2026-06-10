import { Router, type IRouter } from "express";
import { getStandings, COMPETITIONS } from "../services/footballDataService";

const router: IRouter = Router();

router.get("/live/standings", async (req, res): Promise<void> => {
  const slug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : "";
  if (!slug || !COMPETITIONS[slug]) {
    res.status(400).json({ error: "Valid leagueSlug required", available: Object.keys(COMPETITIONS) });
    return;
  }
  try {
    const standings = await getStandings(slug);
    res.json(standings);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch standings");
    res.status(502).json({ error: "Data currently unavailable" });
  }
});

export default router;
