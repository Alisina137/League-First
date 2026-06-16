import type { LiveStanding, LiveMatch, LiveScorer, LiveTeam, LineupPlayer, TeamLineup } from "./footballDataProvider";

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
const errorCache = new Map<string, number>(); // key → retry-after timestamp

const RATE_LIMIT_BACKOFF_MS = 65_000; // back off for 65s on 429

// Global sequential request queue — ensures we never fire more than one
// API-Football request at a time (free plan: 10 req/min).
let inflight: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = inflight.then(() => fn(), () => fn());
  inflight = next.catch(() => {});
  return next;
}

async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > now) return entry.data;

  const retryAfter = errorCache.get(key);
  if (retryAfter && retryAfter > now) {
    throw new Error(`API-Football rate limit: retry after ${Math.ceil((retryAfter - now) / 1000)}s`);
  }

  return enqueue(async () => {
    try {
      const data = await fetcher();
      errorCache.delete(key);
      cache.set(key, { data, expiresAt: Date.now() + ttlMs });
      return data;
    } catch (err) {
      const msg = String(err);
      if (msg.includes("429") || msg.includes("rateLimit")) {
        errorCache.set(key, Date.now() + RATE_LIMIT_BACKOFF_MS);
      }
      throw err;
    }
  });
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
  "europa-league":    { leagueId: 3,   season: 2025, name: "UEFA Europa League", country: "Europe",       code: "EL",  emblem: "https://crests.football-data.org/EL.png" },
  "saudi-pro-league": { leagueId: 307, season: 2025, name: "Saudi Pro League",   country: "Saudi Arabia", code: "SPL", emblem: "https://media.api-sports.io/football/leagues/307.png" },
  "mls":              { leagueId: 253, season: 2026, name: "MLS",                country: "USA",          code: "MLS", emblem: "https://media.api-sports.io/football/leagues/253.png" },
};

function normalizeStatus(short: string): "live" | "upcoming" | "finished" {
  const LIVE_SET     = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"]);
  const FINISHED_SET = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
  if (LIVE_SET.has(short))     return "live";
  if (FINISHED_SET.has(short)) return "finished";
  return "upcoming";
}

function afPeriod(short: string): string | null {
  const MAP: Record<string, string> = {
    "1H": "1H", "HT": "HT", "2H": "2H",
    "ET": "ET", "BT": "HT", "P": "PEN",
    "LIVE": "LIVE", "INT": "INT",
  };
  return MAP[short] ?? null;
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
    const raw = await afFetch(`/fixtures?league=${comp.leagueId}&season=${comp.season}`) as {
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
        period:    normStatus === "live" ? afPeriod(f.fixture.status.short) : null,
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

export async function getMatchLineup(fixtureId: number): Promise<{ homeTeam: TeamLineup; awayTeam: TeamLineup } | null> {
  return cached(`af:lineup:${fixtureId}`, 5 * 60_000, async () => {
    const raw = await afFetch(`/fixtures/lineups?fixture=${fixtureId}`) as {
      response: Array<{
        team: { id: number; name: string; logo: string };
        formation: string | null;
        startXI: Array<{ player: { id: number; name: string; pos: string | null; number: number | null } }>;
        substitutes: Array<{ player: { id: number; name: string; pos: string | null; number: number | null } }>;
      }>;
    };
    if (!raw.response || raw.response.length < 2) return null;
    const [home, away] = raw.response;
    const map = (e: { player: { id: number; name: string; pos: string | null; number: number | null } }): LineupPlayer =>
      ({ id: e.player.id, name: e.player.name, position: e.player.pos ?? null, shirtNumber: e.player.number ?? null });
    if ((home.startXI ?? []).length === 0 && (away.startXI ?? []).length === 0) return null;
    return {
      homeTeam: { id: home.team.id, name: home.team.name, formation: home.formation ?? null, startingXI: (home.startXI ?? []).map(map), bench: (home.substitutes ?? []).map(map) },
      awayTeam: { id: away.team.id, name: away.team.name, formation: away.formation ?? null, startingXI: (away.startXI ?? []).map(map), bench: (away.substitutes ?? []).map(map) },
    };
  });
}

export async function getH2H(homeId: number, awayId: number): Promise<LiveMatch[]> {
  const key = `af:h2h:${Math.min(homeId, awayId)}-${Math.max(homeId, awayId)}`;
  return cached(key, 60 * 60_000, async () => {
    const raw = await afFetch(`/fixtures/headtohead?h2h=${homeId}-${awayId}&last=10`) as {
      response: Array<{
        fixture: { id: number; date: string; status: { short: string } };
        league: { id: number; name: string; logo: string };
        teams: {
          home: { id: number; name: string; code?: string | null; logo: string };
          away: { id: number; name: string; code?: string | null; logo: string };
        };
        goals: { home: number | null; away: number | null };
      }>;
    };
    return (raw.response ?? [])
      .filter(f => normalizeStatus(f.fixture.status.short) === "finished")
      .map(f => ({
        id: f.fixture.id,
        homeTeam: { id: f.teams.home.id, name: f.teams.home.name, shortName: teamShortName(f.teams.home.name, f.teams.home.code), crest: f.teams.home.logo },
        awayTeam: { id: f.teams.away.id, name: f.teams.away.name, shortName: teamShortName(f.teams.away.name, f.teams.away.code), crest: f.teams.away.logo },
        homeScore: f.goals.home, awayScore: f.goals.away,
        status: "finished" as const, minute: null, period: null,
        matchDate: f.fixture.date, matchday: null, venue: null,
        leagueCode: String(f.league.id), leagueName: f.league.name,
        leagueSlug: "", leagueEmblem: f.league.logo,
      }));
  });
}

export interface MatchStatRow { label: string; home: number | string; away: number | string; }

export async function getMatchStats(fixtureId: number): Promise<MatchStatRow[] | null> {
  return cached(`af:stats:${fixtureId}`, 10 * 60_000, async () => {
    const raw = await afFetch(`/fixtures/statistics?fixture=${fixtureId}`) as {
      response: Array<{
        team: { id: number; name: string };
        statistics: Array<{ type: string; value: number | string | null }>;
      }>;
    };
    if (!raw.response || raw.response.length < 2) return null;

    const WANTED: Array<[string, string]> = [
      ["Shots on Goal",    "Shots on Target"],
      ["Total Shots",      "Total Shots"],
      ["Ball Possession",  "Possession"],
      ["Total passes",     "Passes"],
      ["Passes %",         "Pass Accuracy"],
      ["Fouls",            "Fouls"],
      ["Corner Kicks",     "Corners"],
      ["Offsides",         "Offsides"],
      ["Yellow Cards",     "Yellow Cards"],
      ["Red Cards",        "Red Cards"],
      ["Goalkeeper Saves", "Saves"],
    ];

    const toMap = (stats: Array<{ type: string; value: number | string | null }>) =>
      new Map(stats.map(s => [s.type, s.value ?? 0]));

    const homeMap = toMap(raw.response[0].statistics);
    const awayMap = toMap(raw.response[1].statistics);

    const rows: MatchStatRow[] = [];
    for (const [key, label] of WANTED) {
      const h = homeMap.get(key) ?? 0;
      const a = awayMap.get(key) ?? 0;
      rows.push({ label, home: h, away: a });
    }
    return rows.length > 0 ? rows : null;
  });
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) { cache.clear(); errorCache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
  for (const key of errorCache.keys()) {
    if (key.includes(pattern)) errorCache.delete(key);
  }
}
