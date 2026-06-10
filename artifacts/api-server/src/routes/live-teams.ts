import { Router, type IRouter } from "express";
import { getTeams, COMPETITIONS } from "../services/footballDataService";

const router: IRouter = Router();

router.get("/live/teams", async (req, res): Promise<void> => {
  const slug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : "";
  if (!slug || !COMPETITIONS[slug]) {
    res.status(400).json({ error: "Valid leagueSlug required", available: Object.keys(COMPETITIONS) });
    return;
  }
  try {
    const teams = await getTeams(slug);
    res.json(teams);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch teams");
    res.status(502).json({ error: "Data currently unavailable" });
  }
});

export default router;
