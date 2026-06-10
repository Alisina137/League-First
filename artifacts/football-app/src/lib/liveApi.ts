const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

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
  status: "live" | "upcoming" | "finished";
  minute: number | null;
  matchDate: string;
  matchday: number | null;
  stage?: string;
  venue: string | null;
  leagueCode: string;
  leagueName: string;
  leagueSlug: string;
  leagueEmblem: string;
}

export interface KnockoutRound {
  stage: string;
  label: string;
  order: number;
  matches: LiveMatch[];
}

export interface KnockoutData {
  competition: Competition;
  rounds: KnockoutRound[];
  isLive: boolean;
}

export interface LiveScorer {
  player: { id: number; name: string; nationality: string; dateOfBirth: string; position: string | null };
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

export interface Competition {
  slug: string;
  name: string;
  country: string;
  emblem: string;
  code: string;
}

export interface LiveHomepage {
  liveMatches: LiveMatch[];
  upcomingMatches: LiveMatch[];
  featuredStandings: LiveStanding[];
  competitions: Competition[];
}

export const COMPETITIONS: Competition[] = [
  { slug: "premier-league",    name: "Premier League",        country: "England",      emblem: "https://crests.football-data.org/PL.png",                       code: "PL"  },
  { slug: "la-liga",           name: "La Liga",               country: "Spain",        emblem: "https://crests.football-data.org/PD.png",                       code: "PD"  },
  { slug: "serie-a",           name: "Serie A",               country: "Italy",        emblem: "https://crests.football-data.org/SA.png",                       code: "SA"  },
  { slug: "bundesliga",        name: "Bundesliga",            country: "Germany",      emblem: "https://crests.football-data.org/BL1.png",                      code: "BL1" },
  { slug: "ligue-1",           name: "Ligue 1",               country: "France",       emblem: "https://crests.football-data.org/FL1.png",                      code: "FL1" },
  { slug: "champions-league",  name: "UEFA Champions League", country: "Europe",       emblem: "https://crests.football-data.org/CL.png",                       code: "CL"  },
  { slug: "europa-league",     name: "UEFA Europa League",    country: "Europe",       emblem: "https://crests.football-data.org/EL.png",                       code: "EL"  },
  { slug: "saudi-pro-league",  name: "Saudi Pro League",      country: "Saudi Arabia", emblem: "https://media.api-sports.io/football/leagues/307.png",          code: "SPL" },
  { slug: "mls",               name: "MLS",                   country: "USA",          emblem: "https://media.api-sports.io/football/leagues/253.png",          code: "MLS" },
  { slug: "world-cup",         name: "FIFA World Cup",        country: "World",        emblem: "https://crests.football-data.org/WC.png",                       code: "WC"  },
];

export function getCompetition(slug: string): Competition | undefined {
  return COMPETITIONS.find(c => c.slug === slug);
}

export function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

export function normalizePosition(raw: string | null): string {
  if (!raw) return "?";
  const map: Record<string, string> = {
    Goalkeeper: "GK", Defence: "DF", Midfield: "MF", Offence: "FW",
    "Defensive Midfield": "MF", "Central Midfield": "MF", "Attacking Midfield": "MF",
    "Left Midfield": "MF", "Right Midfield": "MF",
    "Centre-Forward": "FW", "Left Winger": "FW", "Right Winger": "FW",
    "Centre-Back": "DF", "Left-Back": "DF", "Right-Back": "DF",
  };
  return map[raw] ?? raw.slice(0, 2).toUpperCase();
}
