import { Router, type IRouter } from "express";
import { getMatches, COMPETITIONS, type LiveMatch } from "../services/footballDataService";

const router: IRouter = Router();

const TOURNAMENT_SLUGS = new Set(["champions-league", "europa-league", "world-cup"]);

const GROUP_STAGES = new Set([
  "GROUP_STAGE", "LEAGUE_PHASE", "LEAGUE_STAGE", "REGULAR_SEASON",
  "PRELIMINARY_ROUND", "PRELIMINARY_SEMI_FINALS", "PRELIMINARY_FINAL",
  "QUALIFICATION_ROUND_1", "QUALIFICATION_ROUND_2", "QUALIFICATION_ROUND_3",
  "1ST_QUALIFYING_ROUND", "2ND_QUALIFYING_ROUND", "3RD_QUALIFYING_ROUND",
  "PLAY_OFF_ROUND", "EXTRA_PRELIMINARY_ROUND",
]);

const KNOCKOUT_STAGE_CONFIG: Record<string, { label: string; order: number }> = {
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
    ?? stage.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function stageOrder(stage: string): number {
  return KNOCKOUT_STAGE_CONFIG[stage]?.order ?? 50;
}

export interface TieLeg {
  matchId: number;
  date: string;
  status: "live" | "upcoming" | "finished";
  homeTeamId: number;
  homeScore: number | null;
  awayScore: number | null;
}

export interface KnockoutTie {
  id: string;
  teamA: { id: number; name: string; shortName: string; crest: string };
  teamB: { id: number; name: string; shortName: string; crest: string };
  leg1: TieLeg | null;
  leg2: TieLeg | null;
  teamAGoals: number | null;
  teamBGoals: number | null;
  winnerId: number | null;
}

export interface KnockoutRound {
  stage: string;
  label: string;
  order: number;
  ties: KnockoutTie[];
}

export interface KnockoutData {
  competition: {
    slug: string; code: string; name: string; country: string; emblem: string;
  };
  rounds: KnockoutRound[];
  allStagesFound: string[];
  isLive: boolean;
}

function toLeg(m: LiveMatch): TieLeg {
  const s = m.status as string;
  const status: "live" | "upcoming" | "finished" =
    s === "live" ? "live" : s === "upcoming" ? "upcoming" : "finished";
  return {
    matchId: m.id,
    date: m.matchDate,
    status,
    homeTeamId: m.homeTeam.id,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
  };
}

function buildTies(matches: LiveMatch[]): KnockoutTie[] {
  // ── Step 1: group fixtures by sorted team-id pair (tie key) ──────────────
  // This ensures we never rely on array index, fixture order, or visual
  // bracket position — the two legs of a tie are always united by the same key
  // regardless of home/away direction.
  const tieMap = new Map<string, LiveMatch[]>();

  for (const m of matches) {
    if (!m.homeTeam?.id || !m.awayTeam?.id || !m.homeTeam.name || !m.awayTeam.name) continue;
    const ids = [m.homeTeam.id, m.awayTeam.id].sort((a, b) => a - b);
    const key = `${ids[0]}_${ids[1]}`;
    if (!tieMap.has(key)) tieMap.set(key, []);
    tieMap.get(key)!.push(m);
  }

  const ties: KnockoutTie[] = [];

  for (const [tieKey, legs] of tieMap.entries()) {
    // ── Step 2: sort by date — earlier date = Leg 1 ─────────────────────────
    // Never assume API order is correct.
    legs.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

    const m1 = legs[0];
    const m2 = legs[1] ?? null;

    // teamA = home side in leg 1
    const teamA = { id: m1.homeTeam.id, name: m1.homeTeam.name, shortName: m1.homeTeam.shortName, crest: m1.homeTeam.crest };
    const teamB = { id: m1.awayTeam.id, name: m1.awayTeam.name, shortName: m1.awayTeam.shortName, crest: m1.awayTeam.crest };

    const leg1 = toLeg(m1);
    const leg2 = m2 ? toLeg(m2) : null;

    // ── Step 3: aggregate calculation ────────────────────────────────────────
    // Derive teamA/teamB goals from each leg's home/away perspective so the
    // maths is correct even if leg2 is a neutral-venue match or the API
    // returns both legs with the same home side (edge case).
    let teamAGoals: number | null = null;
    let teamBGoals: number | null = null;

    const leg1Done = leg1.status === "finished" && leg1.homeScore !== null && leg1.awayScore !== null;

    if (leg1Done) {
      if (!leg2) {
        // Single-leg tie (Final, WC knockout rounds)
        teamAGoals = leg1.homeScore!;
        teamBGoals = leg1.awayScore!;
      } else {
        const leg2Done = leg2.status === "finished" && leg2.homeScore !== null && leg2.awayScore !== null;
        if (leg2Done) {
          // Determine which side teamA is in leg2 via homeTeamId (not position)
          const leg2HomeIsTeamA = leg2.homeTeamId === teamA.id;
          if (leg2HomeIsTeamA) {
            // teamA is home in both legs (unusual — neutral venue, etc.)
            teamAGoals = leg1.homeScore! + leg2.homeScore!;
            teamBGoals = leg1.awayScore! + leg2.awayScore!;
          } else {
            // Normal two-leg: teamA was home in L1, away in L2
            teamAGoals = leg1.homeScore! + leg2.awayScore!;
            teamBGoals = leg1.awayScore! + leg2.homeScore!;
          }
        }
        // Leg 2 not yet finished — leave aggregate null (partial data)
      }
    }

    // ── Step 4: winner determination & consistency validation ────────────────
    // Only assign a winner when aggregate is strictly unambiguous.
    let winnerId: number | null = null;
    const tieComplete = !leg2
      ? leg1Done
      : leg1Done && leg2.status === "finished" && leg2.homeScore !== null && leg2.awayScore !== null;

    if (tieComplete && teamAGoals !== null && teamBGoals !== null) {
      if (teamAGoals > teamBGoals) winnerId = teamA.id;
      else if (teamBGoals > teamAGoals) winnerId = teamB.id;
      // Equal aggregate → requires ET/pens — cannot infer winner from scores alone
    }

    // ── Consistency check ────────────────────────────────────────────────────
    if (winnerId !== null && teamAGoals !== null && teamBGoals !== null) {
      const expectedWinner = teamAGoals > teamBGoals ? teamA.id
        : teamBGoals > teamAGoals ? teamB.id
        : null;
      if (expectedWinner !== winnerId) {
        console.error(
          `[Knockout] INCONSISTENCY detected — Tie: ${tieKey} | ` +
          `Agg: ${teamAGoals}-${teamBGoals} | winnerId: ${winnerId} | expected: ${expectedWinner} — skipping tie`,
        );
        continue;
      }
    }

    // ── Debug log ────────────────────────────────────────────────────────────
    console.debug(
      `[Knockout] Tie: ${tieKey} | ${teamA.shortName} vs ${teamB.shortName} | ` +
      `Leg1 ID: ${m1.id} | Leg2 ID: ${m2?.id ?? "none"} | ` +
      `Agg: ${teamAGoals ?? "?"}-${teamBGoals ?? "?"} | ` +
      `Winner: ${winnerId === teamA.id ? teamA.shortName : winnerId === teamB.id ? teamB.shortName : "TBD"}`,
    );

    ties.push({
      id: m2 ? `${m1.id}-${m2.id}` : `${m1.id}`,
      teamA, teamB, leg1, leg2,
      teamAGoals, teamBGoals, winnerId,
    });
  }

  return ties;
}

router.get("/live/knockout", async (req, res): Promise<void> => {
  const slug = typeof req.query.leagueSlug === "string" ? req.query.leagueSlug : "";

  if (!slug || !COMPETITIONS[slug]) {
    res.status(400).json({ error: "Valid leagueSlug required", available: Object.keys(COMPETITIONS) });
    return;
  }

  if (!TOURNAMENT_SLUGS.has(slug)) {
    res.status(400).json({
      error: "Knockout stage only available for tournament competitions (champions-league, europa-league, world-cup)",
    });
    return;
  }

  const comp = COMPETITIONS[slug];

  try {
    const allMatches = await getMatches(slug);
    const allStagesFound = [...new Set(allMatches.map(m => m.stage).filter(Boolean) as string[])];

    const knockoutMatches = allMatches.filter(m => m.stage && !GROUP_STAGES.has(m.stage));

    // Group by stage
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
        ties: buildTies(matches),
      }))
      .filter(r => r.ties.length > 0) // hide rounds with no valid ties
      .sort((a, b) => a.order - b.order);

    const isLive = knockoutMatches.some(m => m.status === "live");

    const totalTies = rounds.reduce((n, r) => n + r.ties.length, 0);

    req.log.info(
      {
        competition: comp.name,
        competitionCode: comp.code,
        roundCount: rounds.length,
        totalTies,
        allStagesFound,
        isLive,
      },
      `Knockout data served for ${comp.name}: ${rounds.length} rounds, ${totalTies} ties`,
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
