import { logger } from "../lib/logger";

const BASE_URL = "https://api.football-data.org/v4";

function getToken(): string {
  const token = process.env.FOOTBALL_DATA_API_KEY;
  if (!token) throw new Error("FOOTBALL_DATA_API_KEY is not set");
  return token;
}

async function apiFetch(path: string): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "X-Auth-Token": getToken() },
  });
  if (res.status === 429) {
    throw new Error("Rate limited by football-data.org");
  }
  if (!res.ok) {
    throw new Error(`football-data.org ${res.status} for ${path}`);
  }
  return res.json();
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

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
  LIVE: 60_000,
  STANDINGS: 15 * 60_000,
  MATCHES: 5 * 60_000,
  SCORERS: 30 * 60_000,
  TEAMS: 60 * 60_000,
  NEWS: 30 * 60_000,
};

export const COMPETITIONS: Record<string, { code: string; name: string; country: string; emblem: string }> = {
  "premier-league":    { code: "PL",  name: "Premier League",       country: "England",  emblem: "https://crests.football-data.org/PL.png" },
  "la-liga":           { code: "PD",  name: "La Liga",              country: "Spain",    emblem: "https://crests.football-data.org/PD.png" },
  "serie-a":           { code: "SA",  name: "Serie A",              country: "Italy",    emblem: "https://crests.football-data.org/SA.png" },
  "bundesliga":        { code: "BL1", name: "Bundesliga",           country: "Germany",  emblem: "https://crests.football-data.org/BL1.png" },
  "ligue-1":           { code: "FL1", name: "Ligue 1",              country: "France",   emblem: "https://crests.football-data.org/FL1.png" },
  "champions-league":  { code: "CL",  name: "UEFA Champions League",country: "Europe",   emblem: "https://crests.football-data.org/CL.png" },
  "europa-league":     { code: "EL",  name: "UEFA Europa League",   country: "Europe",   emblem: "https://crests.football-data.org/EL.png" },
  "world-cup":         { code: "WC",  name: "FIFA World Cup",       country: "World",    emblem: "https://crests.football-data.org/WC.png" },
};

export interface LiveStanding {
  position: number;
  group?: string;
  team: { id: number; name: string; shortName: string; crest: string };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string | null;
}

export interface LiveMatch {
  id: number;
  homeTeam: { id: number; name: string; shortName: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; crest: string };
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  minute: number | null;
  matchDate: string;
  matchday: number | null;
  venue: string | null;
  leagueCode: string;
  leagueName: string;
  leagueSlug: string;
  leagueEmblem: string;
}

export interface LiveScorer {
  player: {
    id: number;
    name: string;
    nationality: string;
    dateOfBirth: string;
    position: string | null;
  };
  team: { id: number; name: string; shortName: string; crest: string };
  goals: number;
  assists: number | null;
  penalties: number | null;
  playedMatches: number;
  leagueSlug: string;
  leagueName: string;
}

export interface LiveTeam {
  id: number;
  name: string;
  shortName: string;
  crest: string;
  founded: number | null;
  venue: string | null;
  coach: string | null;
  website: string | null;
  leagueSlug: string;
  leagueName: string;
  squadSize: number;
}

function slugFromCode(code: string): string {
  return Object.entries(COMPETITIONS).find(([, v]) => v.code === code)?.[0] ?? code.toLowerCase();
}

function normalizeStatus(s: string): "live" | "upcoming" | "finished" {
  if (["LIVE", "IN_PLAY", "PAUSED", "HALFTIME"].includes(s)) return "live";
  if (["TIMED", "SCHEDULED"].includes(s)) return "upcoming";
  return "finished";
}

function parseMinute(score: { fullTime?: { home: number | null; away: number | null } }, status: string, minute?: number | null): number | null {
  if (normalizeStatus(status) === "live" && minute != null) return minute;
  return null;
}

export async function getStandings(slug: string): Promise<LiveStanding[]> {
  const comp = COMPETITIONS[slug];
  if (!comp) return [];
  return cached(`standings:${slug}`, TTL.STANDINGS, async () => {
    const data = await apiFetch(`/competitions/${comp.code}/standings`) as {
      standings: Array<{
        type: string;
        group?: string | null;
        table: Array<{
          position: number;
          team: { id: number; name: string; shortName: string; crest: string };
          playedGames: number; won: number; draw: number; lost: number;
          goalsFor: number; goalsAgainst: number; goalDifference: number;
          points: number; form: string | null;
        }>;
      }>;
    };

    const totalGroups = data.standings.filter(s => s.type === "TOTAL");
    const sourceGroups = totalGroups.length > 0 ? totalGroups : data.standings;
    const isMultiGroup = sourceGroups.length > 1;

    logger.info(
      {
        competition: comp.name,
        competitionCode: comp.code,
        endpoint: `/competitions/${comp.code}/standings`,
        groupCount: sourceGroups.length,
        isMultiGroup,
        returnedCompetition: comp.name,
      },
      `Selected: ${comp.name} | Competition ID: ${comp.code} | Standings Endpoint: /competitions/${comp.code}/standings | Returned Competition: ${comp.name}`
    );

    if (!isMultiGroup) {
      const single = sourceGroups[0];
      return (single?.table ?? []).map(r => ({
        position: r.position,
        team: r.team,
        played: r.playedGames,
        won: r.won,
        drawn: r.draw,
        lost: r.lost,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        goalDifference: r.goalDifference,
        points: r.points,
        form: r.form,
      }));
    }

    const allRows: LiveStanding[] = [];
    for (const grp of sourceGroups) {
      const groupLabel = grp.group
        ? grp.group.replace(/^GROUP_/, "Group ").replace(/_/g, " ")
        : undefined;
      for (const r of grp.table) {
        allRows.push({
          position: r.position,
          group: groupLabel,
          team: r.team,
          played: r.playedGames,
          won: r.won,
          drawn: r.draw,
          lost: r.lost,
          goalsFor: r.goalsFor,
          goalsAgainst: r.goalsAgainst,
          goalDifference: r.goalDifference,
          points: r.points,
          form: r.form,
        });
      }
    }
    return allRows;
  });
}

export async function getMatches(slug: string, status?: string): Promise<LiveMatch[]> {
  const comp = COMPETITIONS[slug];
  if (!comp) return [];
  const cacheKey = `matches:${slug}:${status ?? "all"}`;
  const ttl = status === "LIVE" || status === "IN_PLAY" ? TTL.LIVE : TTL.MATCHES;
  return cached(cacheKey, ttl, async () => {
    const qs = status ? `?status=${status}` : "";
    const data = await apiFetch(`/competitions/${comp.code}/matches${qs}`) as {
      matches: Array<{
        id: number;
        utcDate: string;
        status: string;
        matchday: number | null;
        homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
        awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
        score: { fullTime: { home: number | null; away: number | null }; halfTime?: { home: number | null; away: number | null } };
        minute?: number | null;
        venue?: string | null;
      }>;
    };
    return (data.matches ?? []).map(m => ({
      id: m.id,
      homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name, shortName: m.homeTeam.shortName ?? m.homeTeam.tla, crest: m.homeTeam.crest },
      awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name, shortName: m.awayTeam.shortName ?? m.awayTeam.tla, crest: m.awayTeam.crest },
      homeScore: m.score.fullTime.home,
      awayScore: m.score.fullTime.away,
      status: normalizeStatus(m.status),
      minute: parseMinute(m.score, m.status, m.minute),
      matchDate: m.utcDate,
      matchday: m.matchday,
      venue: m.venue ?? null,
      leagueCode: comp.code,
      leagueName: comp.name,
      leagueSlug: slug,
      leagueEmblem: comp.emblem,
    }));
  });
}

export async function getAllLiveMatches(): Promise<LiveMatch[]> {
  return cached("live:all", TTL.LIVE, async () => {
    const data = await apiFetch(`/matches?status=LIVE`) as {
      matches: Array<{
        id: number;
        competition: { id: number; code: string; name: string; emblem: string | null };
        utcDate: string;
        status: string;
        matchday: number | null;
        homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
        awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
        score: { fullTime: { home: number | null; away: number | null } };
        minute?: number | null;
        venue?: string | null;
      }>;
    };
    return (data.matches ?? []).map(m => {
      const slug = slugFromCode(m.competition.code);
      return {
        id: m.id,
        homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name, shortName: m.homeTeam.shortName ?? m.homeTeam.tla, crest: m.homeTeam.crest },
        awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name, shortName: m.awayTeam.shortName ?? m.awayTeam.tla, crest: m.awayTeam.crest },
        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
        status: "live" as const,
        minute: m.minute ?? null,
        matchDate: m.utcDate,
        matchday: m.matchday,
        venue: m.venue ?? null,
        leagueCode: m.competition.code,
        leagueName: m.competition.name,
        leagueSlug: slug,
        leagueEmblem: m.competition.emblem ?? "",
      };
    });
  });
}

export async function getAllUpcomingMatches(): Promise<LiveMatch[]> {
  return cached("upcoming:all", TTL.MATCHES, async () => {
    const data = await apiFetch(`/matches?status=SCHEDULED`) as {
      matches: Array<{
        id: number;
        competition: { id: number; code: string; name: string; emblem: string | null };
        utcDate: string;
        status: string;
        matchday: number | null;
        homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
        awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
        score: { fullTime: { home: number | null; away: number | null } };
        venue?: string | null;
      }>;
    };
    const knownCodes = new Set(Object.values(COMPETITIONS).map(c => c.code));
    return (data.matches ?? [])
      .filter(m => knownCodes.has(m.competition.code))
      .slice(0, 50)
      .map(m => {
        const slug = slugFromCode(m.competition.code);
        return {
          id: m.id,
          homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name, shortName: m.homeTeam.shortName ?? m.homeTeam.tla, crest: m.homeTeam.crest },
          awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name, shortName: m.awayTeam.shortName ?? m.awayTeam.tla, crest: m.awayTeam.crest },
          homeScore: null,
          awayScore: null,
          status: "upcoming" as const,
          minute: null,
          matchDate: m.utcDate,
          matchday: m.matchday,
          venue: m.venue ?? null,
          leagueCode: m.competition.code,
          leagueName: m.competition.name,
          leagueSlug: slug,
          leagueEmblem: COMPETITIONS[slug]?.emblem ?? "",
        };
      });
  });
}

export async function getScorers(slug: string): Promise<LiveScorer[]> {
  const comp = COMPETITIONS[slug];
  if (!comp) return [];
  return cached(`scorers:${slug}`, TTL.SCORERS, async () => {
    const data = await apiFetch(`/competitions/${comp.code}/scorers?limit=20`) as {
      scorers: Array<{
        player: { id: number; name: string; nationality: string; dateOfBirth: string; position: string | null };
        team: { id: number; name: string; shortName: string; crest: string };
        goals: number;
        assists: number | null;
        penalties: number | null;
        playedMatches: number;
      }>;
    };
    return (data.scorers ?? []).map(s => ({
      player: s.player,
      team: s.team,
      goals: s.goals,
      assists: s.assists,
      penalties: s.penalties,
      playedMatches: s.playedMatches,
      leagueSlug: slug,
      leagueName: comp.name,
    }));
  });
}

export async function getTeams(slug: string): Promise<LiveTeam[]> {
  const comp = COMPETITIONS[slug];
  if (!comp) return [];
  return cached(`teams:${slug}`, TTL.TEAMS, async () => {
    const data = await apiFetch(`/competitions/${comp.code}/teams`) as {
      teams: Array<{
        id: number;
        name: string;
        shortName: string;
        crest: string;
        founded: number | null;
        venue: string | null;
        website: string | null;
        coach?: { name: string } | null;
        squad?: Array<unknown>;
      }>;
    };
    return (data.teams ?? []).map(t => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName ?? t.name,
      crest: t.crest,
      founded: t.founded,
      venue: t.venue,
      coach: t.coach?.name ?? null,
      website: t.website,
      leagueSlug: slug,
      leagueName: comp.name,
      squadSize: t.squad?.length ?? 0,
    }));
  });
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    logger.info("Cache cleared entirely");
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}
