import { Router, type IRouter } from "express";
import { getScorers, COMPETITIONS } from "../services/footballDataService";

const router: IRouter = Router();

router.get("/live/scorers", async (req, res): Promise<void> => {
  const slug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : "";
  if (!slug || !COMPETITIONS[slug]) {
    res.status(400).json({ error: "Valid leagueSlug required", available: Object.keys(COMPETITIONS) });
    return;
  }
  try {
    const scorers = await getScorers(slug);
    res.json(scorers);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch scorers");
    res.status(502).json({ error: "Data currently unavailable" });
  }
});

export default router;
