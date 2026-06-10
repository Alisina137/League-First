import { logger } from "../../lib/logger";
import * as fd from "./footballDataProvider";
import * as af from "./apiFootballProvider";
import type { LiveStanding, LiveMatch, LiveScorer, LiveTeam } from "./footballDataProvider";

export type { LiveStanding, LiveMatch, LiveScorer, LiveTeam };
export { ForbiddenError } from "./footballDataProvider";

type Provider = "football-data" | "api-football";

interface RouteConfig {
  primary:   Provider;
  fallback?: Provider;
}

const ROUTING: Record<string, RouteConfig> = {
  "premier-league":    { primary: "football-data", fallback: "api-football" },
  "la-liga":           { primary: "football-data", fallback: "api-football" },
  "serie-a":           { primary: "football-data", fallback: "api-football" },
  "bundesliga":        { primary: "football-data", fallback: "api-football" },
  "ligue-1":           { primary: "football-data", fallback: "api-football" },
  "champions-league":  { primary: "football-data", fallback: "api-football" },
  "world-cup":         { primary: "football-data", fallback: "api-football" },
  "europa-league":     { primary: "api-football",  fallback: "football-data" },
  "saudi-pro-league":  { primary: "api-football" },
  "mls":               { primary: "api-football" },
};

export const COMPETITIONS: Record<string, { code: string; name: string; country: string; emblem: string }> = {
  ...Object.fromEntries(
    Object.entries(fd.FD_COMPETITIONS).map(([slug, c]) => [slug, c])
  ),
  ...Object.fromEntries(
    Object.entries(af.AF_COMPETITIONS).map(([slug, c]) => [slug, {
      code: c.code, name: c.name, country: c.country, emblem: c.emblem,
    }])
  ),
};

function providerLabel(p: Provider): string {
  return p === "football-data" ? "football-data.org" : "API-Football";
}

async function route<T>(
  slug:       string,
  operation:  string,
  primaryFn:  () => Promise<T>,
  fallbackFn: (() => Promise<T>) | undefined,
): Promise<T> {
  const cfg  = ROUTING[slug];
  const comp = COMPETITIONS[slug];
  const compName = comp?.name ?? slug;

  try {
    const result = await primaryFn();
    logger.info(
      { competition: compName, provider: providerLabel(cfg.primary), operation, status: "success" },
      `Competition: ${compName} | Provider: ${providerLabel(cfg.primary)} | Endpoint: ${operation} | Status: success`,
    );
    return result;
  } catch (primaryErr) {
    logger.warn(
      { competition: compName, provider: providerLabel(cfg.primary), operation, err: String(primaryErr) },
      `Competition: ${compName} | Provider: ${providerLabel(cfg.primary)} | Endpoint: ${operation} | Status: failed — trying fallback`,
    );

    if (!fallbackFn) {
      throw new Error(`${compName} data currently unavailable.`);
    }

    try {
      const result = await fallbackFn();
      logger.info(
        { competition: compName, provider: providerLabel(cfg.fallback!), operation, status: "fallback-success" },
        `Competition: ${compName} | Provider: ${providerLabel(cfg.fallback!)} | Endpoint: ${operation} | Status: fallback-success`,
      );
      return result;
    } catch (fallbackErr) {
      logger.error(
        { competition: compName, operation, primaryErr: String(primaryErr), fallbackErr: String(fallbackErr) },
        `Competition: ${compName} | Provider: both failed | Endpoint: ${operation} | Status: error`,
      );
      throw new Error(`${compName} data currently unavailable.`);
    }
  }
}

function resolveProviderFns<T>(
  slug:      string,
  fdFn:      ((s: string, ...a: unknown[]) => Promise<T>) | null,
  afFn:      ((s: string, ...a: unknown[]) => Promise<T>) | null,
  extra?:    unknown[],
): { primaryFn: () => Promise<T>; fallbackFn: (() => Promise<T>) | undefined } {
  const cfg = ROUTING[slug];
  const inFd = slug in fd.FD_COMPETITIONS;
  const inAf = slug in af.AF_COMPETITIONS;
  const args = extra ?? [];

  const fdCallable  = inFd && fdFn  ? (() => (fdFn as Function)(slug, ...args) as Promise<T>) : null;
  const afCallable  = inAf && afFn  ? (() => (afFn as Function)(slug, ...args) as Promise<T>) : null;

  const primaryFn  = cfg.primary  === "football-data" ? fdCallable  : afCallable;
  const fbProvider = cfg.fallback === "football-data" ? fdCallable  : afCallable;
  const fallbackFn = cfg.fallback ? (fbProvider ?? undefined) : undefined;

  if (!primaryFn) throw new Error(`No provider available for ${slug}`);
  return { primaryFn, fallbackFn };
}

export async function getStandings(slug: string): Promise<LiveStanding[]> {
  if (!ROUTING[slug]) return [];
  const { primaryFn, fallbackFn } = resolveProviderFns<LiveStanding[]>(
    slug, fd.getStandings, af.getStandings,
  );
  return route(slug, "standings", primaryFn, fallbackFn);
}

export async function getMatches(slug: string, status?: string): Promise<LiveMatch[]> {
  if (!ROUTING[slug]) return [];
  const { primaryFn, fallbackFn } = resolveProviderFns<LiveMatch[]>(
    slug, fd.getMatches, af.getMatches, status ? [status] : [],
  );
  return route(slug, `matches(${status ?? "all"})`, primaryFn, fallbackFn);
}

export async function getScorers(slug: string): Promise<LiveScorer[]> {
  if (!ROUTING[slug]) return [];
  const { primaryFn, fallbackFn } = resolveProviderFns<LiveScorer[]>(
    slug, fd.getScorers, af.getScorers,
  );
  return route(slug, "scorers", primaryFn, fallbackFn);
}

export async function getTeams(slug: string): Promise<LiveTeam[]> {
  if (!ROUTING[slug]) return [];
  const { primaryFn, fallbackFn } = resolveProviderFns<LiveTeam[]>(
    slug, fd.getTeams, af.getTeams,
  );
  return route(slug, "teams", primaryFn, fallbackFn);
}

export function invalidateCache(pattern?: string): void {
  fd.invalidateCache(pattern);
  af.invalidateCache(pattern);
}
