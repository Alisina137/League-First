import { Router, type IRouter } from "express";
import { getMatches, COMPETITIONS, type LiveMatch } from "../services/footballDataService";

const router: IRouter = Router();

const TOURNAMENT_SLUGS = new Set(["champions-league", "europa-league", "world-cup"]);

const GROUP_STAGES = new Set([
  // Generic group/league phases
  "GROUP_STAGE", "LEAGUE_PHASE", "LEAGUE_STAGE", "REGULAR_SEASON",
  // Preliminary / qualifying rounds (not real knockout)
  "PRELIMINARY_ROUND", "PRELIMINARY_SEMI_FINALS", "PRELIMINARY_FINAL",
  "QUALIFICATION_ROUND_1", "QUALIFICATION_ROUND_2", "QUALIFICATION_ROUND_3",
  "1ST_QUALIFYING_ROUND", "2ND_QUALIFYING_ROUND", "3RD_QUALIFYING_ROUND",
  "PLAY_OFF_ROUND", "EXTRA_PRELIMINARY_ROUND",
]);

const KNOCKOUT_STAGE_CONFIG: Record<string, { label: string; order: number }> = {
  // Champions League / Europa League actual knockout names from API
  PLAYOFFS:                 { label: "Knockout Playoffs", order: 1 },
  KNOCKOUT_ROUND_PLAY_OFFS: { label: "Knockout Playoffs", order: 1 },
  LAST_32:                  { label: "Round of 32",       order: 2 },
  ROUND_OF_16:              { label: "Round of 16",       order: 3 },
  LAST_16:                  { label: "Round of 16",       order: 3 },
  QUARTER_FINALS:           { label: "Quarter Finals",    order: 4 },
  SEMI_FINALS:              { label: "Semi Finals",       order: 5 },
  THIRD_PLACE:              { label: "Third Place",       order: 6 },
  FINAL:                    { label: "Final",             order: 7 },
};

function stageLabel(stage: string): string {
  return KNOCKOUT_STAGE_CONFIG[stage]?.label
    ?? stage
        .split("_")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

function stageOrder(stage: string): number {
  return KNOCKOUT_STAGE_CONFIG[stage]?.order ?? 50;
}

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
  allStagesFound: string[];
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

    const allStagesFound = [...new Set(allMatches.map(m => m.stage).filter(Boolean) as string[])];

    const knockoutMatches = allMatches.filter(m => {
      if (!m.stage) return false;
      return !GROUP_STAGES.has(m.stage);
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
        label: stageLabel(stage),
        order: stageOrder(stage),
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
        allStagesFound,
        isLive,
      },
      `Knockout data served for ${comp.name}: ${rounds.length} rounds, ${knockoutMatches.length} matches. Stages in API: [${allStagesFound.join(", ")}]`
    );

    const response: KnockoutData = {
      competition: { slug, code: comp.code, name: comp.name, country: comp.country, emblem: comp.emblem },
      rounds,
      allStagesFound,
      isLive,
    };

    res.json(response);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch knockout data");
    res.status(502).json({ error: "Knockout data currently unavailable" });
  }
});

export default router;
