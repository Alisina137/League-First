import { Router, type IRouter } from "express";
import { getStandings, COMPETITIONS } from "../services/footballDataService";

const router: IRouter = Router();

router.get("/live/standings", async (req, res): Promise<void> => {
  const slug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : "";
  if (!slug || !COMPETITIONS[slug]) {
    res.status(400).json({ error: "Valid leagueSlug required", available: Object.keys(COMPETITIONS) });
    return;
  }

  const comp = COMPETITIONS[slug];
  req.log.info(
    {
      selectedCompetition: comp.name,
      competitionId: comp.code,
      standingsEndpoint: `/competitions/${comp.code}/standings`,
    },
    `Selected Competition: ${comp.name} | Competition ID: ${comp.code} | Standings Endpoint: /competitions/${comp.code}/standings`
  );

  try {
    const standings = await getStandings(slug);

    if (standings.length > 0) {
      req.log.info(
        { returnedCompetition: comp.name, rowCount: standings.length },
        `Returned Competition: ${comp.name} — ${standings.length} rows`
      );
    }

    res.json(standings);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch standings");
    res.status(502).json({ error: "Data currently unavailable" });
  }
});

export default router;
