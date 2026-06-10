import type { LiveStanding, LiveMatch, LiveScorer, LiveTeam } from "./footballDataProvider";

const AF_BASE = "https://v3.football.api-sports.io";

function getKey(): string {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY is not configured");
  return key;
}

async function afFetch(path: string): Promise<unknown> {
  const url = `${AF_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "x-apisports-key": getKey() },
  });
  if (!res.ok) throw new Error(`API-Football HTTP ${res.status} for ${path}`);
  const json = await res.json() as { errors?: Record<string, string>; results?: number; response: unknown[] };
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(json.errors)}`);
  }
  return json;
}

interface CacheEntry<T> { data: T; expiresAt: number; }
const cache = new Map<string, CacheEntry<unknown>>();

async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > now) return entry.data;
  const data = await fetcher();
  cache.set(key, { data, expiresAt: now + ttlMs });
  return data;
}

const TTL = {
  LIVE:      60_000,
  STANDINGS: 15 * 60_000,
  MATCHES:   5  * 60_000,
  SCORERS:   30 * 60_000,
  TEAMS:     60 * 60_000,
};

export const AF_COMPETITIONS: Record<string, {
  leagueId: number; season: number;
  name: string; country: string; code: string; emblem: string;
}> = {
  "europa-league":    { leagueId: 3,   season: 2024, name: "UEFA Europa League", country: "Europe",       code: "EL",  emblem: "https://crests.football-data.org/EL.png" },
  "saudi-pro-league": { leagueId: 307, season: 2024, name: "Saudi Pro League",   country: "Saudi Arabia", code: "SPL", emblem: "https://media.api-sports.io/football/leagues/307.png" },
  "mls":              { leagueId: 253, season: 2025, name: "MLS",                country: "USA",          code: "MLS", emblem: "https://media.api-sports.io/football/leagues/253.png" },
};

function normalizeStatus(short: string): "live" | "upcoming" | "finished" {
  const LIVE_SET     = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"]);
  const FINISHED_SET = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
  if (LIVE_SET.has(short))     return "live";
  if (FINISHED_SET.has(short)) return "finished";
  return "upcoming";
}

function normalizeRound(round: string): string {
  const r = round.toLowerCase();
  if (r.startsWith("group stage") || r.startsWith("regular season") || r.startsWith("league phase")) return "GROUP_STAGE";
  if (r.includes("knockout round play-off") || r.includes("knockout play-off")) return "KNOCKOUT_ROUND_PLAY_OFFS";
  if (r.startsWith("round of 32") || r.startsWith("last 32")) return "LAST_32";
  if (r.startsWith("round of 16") || r.startsWith("last 16")) return "LAST_16";
  if (r.includes("quarter-final") || r.startsWith("quarter final")) return "QUARTER_FINALS";
  if (r.includes("semi-final") || r.startsWith("semi final")) return "SEMI_FINALS";
  if (r.includes("3rd place") || r.includes("third place")) return "THIRD_PLACE";
  if (r === "final") return "FINAL";
  return "REGULAR_SEASON";
}

function parseMatchday(round: string): number | null {
  const m = round.match(/ - (\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

function teamShortName(name: string, code?: string | null): string {
  if (code && code.length >= 2 && code.length <= 5) return code;
  const words = name.split(/\s+/);
  if (words.length === 1) return name.slice(0, 8);
  return words.map(w => w[0]).join("").toUpperCase().slice(0, 4);
}

function dateWindowParam(): string {
  const now = new Date();
  const from = new Date(now); from.setDate(from.getDate() - 90);
  const to   = new Date(now); to.setDate(to.getDate() + 90);
  const fmt  = (d: Date) => d.toISOString().split("T")[0];
  return `&from=${fmt(from)}&to=${fmt(to)}`;
}

export async function getStandings(slug: string): Promise<LiveStanding[]> {
  const comp = AF_COMPETITIONS[slug];
  if (!comp) throw new Error(`No API-Football config for ${slug}`);
  return cached(`af:standings:${slug}`, TTL.STANDINGS, async () => {
    type AFStandingRow = {
      rank: number;
      team: { id: number; name: string; logo: string };
      points: number; goalsDiff: number; group: string; form: string;
      all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
    };
    const raw = await afFetch(`/standings?league=${comp.leagueId}&season=${comp.season}`) as {
      response: Array<{ league: { standings: AFStandingRow[][] } }>;
    };
    const groups = raw.response[0]?.league?.standings ?? [];
    const isMultiGroup = groups.length > 1;
    const result: LiveStanding[] = [];
    for (const group of groups) {
      const groupLabel = isMultiGroup && group[0]?.group ? group[0].group : undefined;
      for (const row of group) {
        result.push({
          position:       row.rank,
          group:          groupLabel,
          team:           { id: row.team.id, name: row.team.name, shortName: teamShortName(row.team.name), crest: row.team.logo },
          played:         row.all.played,
          won:            row.all.win,
          drawn:          row.all.draw,
          lost:           row.all.lose,
          goalsFor:       row.all.goals.for,
          goalsAgainst:   row.all.goals.against,
          goalDifference: row.goalsDiff,
          points:         row.points,
          form:           row.form?.split("").slice(-5).join("") ?? null,
        });
      }
    }
    return result;
  });
}

export async function getMatches(slug: string, status?: string): Promise<LiveMatch[]> {
  const comp = AF_COMPETITIONS[slug];
  if (!comp) throw new Error(`No API-Football config for ${slug}`);
  return cached(`af:matches:${slug}:all`, TTL.MATCHES, async () => {
    const window = dateWindowParam();
    const raw = await afFetch(`/fixtures?league=${comp.leagueId}&season=${comp.season}${window}`) as {
      response: Array<{
        fixture: {
          id: number; date: string; venue: { name: string; city: string } | null;
          status: { short: string; elapsed: number | null };
        };
        league: { round: string };
        teams: {
          home: { id: number; name: string; code?: string | null; logo: string };
          away: { id: number; name: string; code?: string | null; logo: string };
        };
        goals: { home: number | null; away: number | null };
      }>;
    };

    const allMatches: LiveMatch[] = (raw.response ?? []).map(f => {
      const normStatus = normalizeStatus(f.fixture.status.short);
      const stage      = normalizeRound(f.league.round);
      const matchday   = parseMatchday(f.league.round);
      return {
        id:        f.fixture.id,
        homeTeam:  { id: f.teams.home.id, name: f.teams.home.name, shortName: teamShortName(f.teams.home.name, f.teams.home.code), crest: f.teams.home.logo },
        awayTeam:  { id: f.teams.away.id, name: f.teams.away.name, shortName: teamShortName(f.teams.away.name, f.teams.away.code), crest: f.teams.away.logo },
        homeScore: normStatus !== "upcoming" ? f.goals.home : null,
        awayScore: normStatus !== "upcoming" ? f.goals.away : null,
        status:    normStatus,
        minute:    normStatus === "live" ? (f.fixture.status.elapsed ?? null) : null,
        matchDate: f.fixture.date,
        matchday,
        stage,
        venue:       f.fixture.venue?.name ?? null,
        leagueCode:  comp.code,
        leagueName:  comp.name,
        leagueSlug:  slug,
        leagueEmblem: comp.emblem,
      };
    });

    return allMatches;
  }).then(matches => {
    if (!status) return matches;
    if (status === "LIVE" || status === "IN_PLAY") return matches.filter(m => m.status === "live");
    if (status === "SCHEDULED" || status === "TIMED") return matches.filter(m => m.status === "upcoming");
    if (status === "FINISHED") return matches.filter(m => m.status === "finished");
    return matches;
  });
}

export async function getScorers(slug: string): Promise<LiveScorer[]> {
  const comp = AF_COMPETITIONS[slug];
  if (!comp) throw new Error(`No API-Football config for ${slug}`);
  return cached(`af:scorers:${slug}`, TTL.SCORERS, async () => {
    const raw = await afFetch(`/players/topscorers?league=${comp.leagueId}&season=${comp.season}`) as {
      response: Array<{
        player: {
          id: number; name: string; nationality: string;
          birth: { date: string }; photo: string;
        };
        statistics: Array<{
          team: { id: number; name: string; code?: string | null; logo: string };
          goals: { total: number | null; assists: number | null; conceded?: number | null; saves?: number | null; penalties?: { scored?: number | null } };
          games: { appearences: number | null; position: string | null };
        }>;
      }>;
    };
    return (raw.response ?? []).slice(0, 20).map(r => {
      const stats = r.statistics[0];
      return {
        player: {
          id:          r.player.id,
          name:        r.player.name,
          nationality: r.player.nationality,
          dateOfBirth: r.player.birth.date,
          position:    stats?.games.position ?? null,
        },
        team: {
          id:        stats?.team.id ?? 0,
          name:      stats?.team.name ?? "",
          shortName: teamShortName(stats?.team.name ?? "", stats?.team.code),
          crest:     stats?.team.logo ?? "",
        },
        goals:         stats?.goals.total ?? 0,
        assists:       stats?.goals.assists ?? null,
        penalties:     stats?.goals.penalties?.scored ?? null,
        playedMatches: stats?.games.appearences ?? 0,
        leagueSlug:    slug,
        leagueName:    comp.name,
      };
    });
  });
}

export async function getTeams(slug: string): Promise<LiveTeam[]> {
  const comp = AF_COMPETITIONS[slug];
  if (!comp) throw new Error(`No API-Football config for ${slug}`);
  return cached(`af:teams:${slug}`, TTL.TEAMS, async () => {
    const raw = await afFetch(`/teams?league=${comp.leagueId}&season=${comp.season}`) as {
      response: Array<{
        team: { id: number; name: string; code?: string | null; logo: string; founded: number | null };
        venue: { name: string | null } | null;
      }>;
    };
    return (raw.response ?? []).map(r => ({
      id:        r.team.id,
      name:      r.team.name,
      shortName: teamShortName(r.team.name, r.team.code),
      crest:     r.team.logo,
      founded:   r.team.founded,
      venue:     r.venue?.name ?? null,
      coach:     null,
      website:   null,
      leagueSlug:  slug,
      leagueName:  comp.name,
      squadSize:   0,
    }));
  });
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}
