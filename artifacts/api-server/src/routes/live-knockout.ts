import { Router, type IRouter } from "express";
import { getMatches, COMPETITIONS, type LiveMatch } from "../services/footballDataService";

const router: IRouter = Router();

const TOURNAMENT_SLUGS = new Set(["champions-league", "europa-league", "world-cup"]);

const GROUP_STAGES = new Set([
  "GROUP_STAGE", "LEAGUE_PHASE", "REGULAR_SEASON",
  "PRELIMINARY_ROUND", "PRELIMINARY_SEMI_FINALS", "PRELIMINARY_FINAL",
  "QUALIFICATION_ROUND_1", "QUALIFICATION_ROUND_2", "QUALIFICATION_ROUND_3",
]);

const KNOCKOUT_STAGE_CONFIG: Record<string, { label: string; order: number }> = {
  KNOCKOUT_ROUND_PLAY_OFFS: { label: "Knockout Playoffs", order: 1 },
  ROUND_OF_16:              { label: "Round of 16",       order: 2 },
  QUARTER_FINALS:           { label: "Quarter Finals",    order: 3 },
  SEMI_FINALS:              { label: "Semi Finals",       order: 4 },
  THIRD_PLACE:              { label: "Third Place",       order: 5 },
  FINAL:                    { label: "Final",             order: 6 },
};

export interface KnockoutRound {
  stage: string;
  label: string;
  order: number;
  matches: LiveMatch[];
}

export interface KnockoutData {
  competition: {
    slug: string;
    code: string;
    name: string;
    country: string;
    emblem: string;
  };
  rounds: KnockoutRound[];
  isLive: boolean;
}

router.get("/live/knockout", async (req, res): Promise<void> => {
  const slug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : "";

  if (!slug || !COMPETITIONS[slug]) {
    res.status(400).json({ error: "Valid leagueSlug required", available: Object.keys(COMPETITIONS) });
    return;
  }

  if (!TOURNAMENT_SLUGS.has(slug)) {
    res.status(400).json({ error: "Knockout stage only available for tournament competitions (champions-league, europa-league, world-cup)" });
    return;
  }

  const comp = COMPETITIONS[slug];

  try {
    const allMatches = await getMatches(slug);

    const knockoutMatches = allMatches.filter(m => {
      if (!m.stage) return false;
      return !GROUP_STAGES.has(m.stage) && KNOCKOUT_STAGE_CONFIG[m.stage] !== undefined;
    });

    const roundMap = new Map<string, LiveMatch[]>();
    for (const match of knockoutMatches) {
      const stage = match.stage!;
      if (!roundMap.has(stage)) roundMap.set(stage, []);
      roundMap.get(stage)!.push(match);
    }

    const rounds: KnockoutRound[] = Array.from(roundMap.entries())
      .map(([stage, matches]) => ({
        stage,
        label: KNOCKOUT_STAGE_CONFIG[stage]?.label ?? stage.replace(/_/g, " "),
        order: KNOCKOUT_STAGE_CONFIG[stage]?.order ?? 99,
        matches: matches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()),
      }))
      .sort((a, b) => a.order - b.order);

    const isLive = knockoutMatches.some(m => m.status === "live");

    req.log.info(
      {
        competition: comp.name,
        competitionCode: comp.code,
        roundCount: rounds.length,
        knockoutMatchCount: knockoutMatches.length,
        isLive,
      },
      `Knockout data served for ${comp.name}: ${rounds.length} rounds, ${knockoutMatches.length} matches`
    );

    const response: KnockoutData = {
      competition: { slug, code: comp.code, name: comp.name, country: comp.country, emblem: comp.emblem },
      rounds,
      isLive,
    };

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch knockout data");
    res.status(502).json({ error: "Knockout data currently unavailable" });
  }
});

export default router;
