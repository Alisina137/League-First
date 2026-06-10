import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  apiFetch,
  COMPETITIONS,
  type LiveStanding,
  type LiveMatch,
  type LiveScorer,
  type LiveTeam,
  type KnockoutData,
} from "../lib/liveApi";
import { TableSkeleton, ErrorState, EmptyState } from "../components/Skeleton";
import { Trophy, Calendar, Users, TrendingUp, Shield, ChevronRight, Zap } from "lucide-react";

interface LeagueHubData {
  competition: { slug: string; code: string; name: string; country: string; emblem: string };
  standings: LiveStanding[];
  liveMatches: LiveMatch[];
  upcomingMatches: LiveMatch[];
  recentMatches: LiveMatch[];
  scorers: LiveScorer[];
  nextFixtureDate: string | null;
  hasStarted: boolean;
}

type Tab = "overview" | "groups" | "knockout" | "matches" | "teams";

const TOURNAMENT_SLUGS = new Set(["champions-league", "europa-league", "world-cup"]);
const UNSUPPORTED_SLUGS = new Set(["saudi-pro-league", "mls"]);

const TAB_CONFIG: { id: Tab; label: string }[] = [
  { id: "overview",  label: "Overview"    },
  { id: "groups",    label: "Group Stage" },
  { id: "knockout",  label: "Knockout"    },
  { id: "matches",   label: "Matches"     },
  { id: "teams",     label: "Teams"       },
];

const formColors: Record<string, string> = {
  W: "bg-green-500",
  D: "bg-yellow-500",
  L: "bg-red-500",
};

function MatchRow({ match }: { match: LiveMatch }) {
  const isLive = match.status === "live";
  const date = new Date(match.matchDate);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${isLive ? "bg-primary/5" : ""}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <img src={match.homeTeam.crest} alt={match.homeTeam.shortName} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
        <span className="text-sm font-semibold truncate">{match.homeTeam.shortName}</span>
      </div>
      <div className="text-center px-3 flex-shrink-0">
        {isLive ? (
          <span className="text-xs font-bold text-primary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {match.minute ? `${match.minute}'` : "LIVE"}
          </span>
        ) : hasScore ? (
          <span className="text-sm font-bold tabular-nums">{match.homeScore} – {match.awayScore}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{dateStr}<br />{timeStr}</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className="text-sm font-semibold truncate text-right">{match.awayTeam.shortName}</span>
        <img src={match.awayTeam.crest} alt={match.awayTeam.shortName} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
      </div>
    </div>
  );
}

function SmartUpcomingPlaceholder({
  nextFixtureDate,
  hasStarted,
  isTournament,
  competitionName,
  competitionEmblem,
}: {
  nextFixtureDate: string | null;
  hasStarted: boolean;
  isTournament: boolean;
  competitionName: string;
  competitionEmblem: string;
}) {
  const daysUntil = nextFixtureDate
    ? Math.ceil((new Date(nextFixtureDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const nextDateFormatted = nextFixtureDate
    ? new Date(nextFixtureDate).toLocaleDateString([], { weekday: "short", month: "long", day: "numeric", year: "numeric" })
    : null;

  const countdownLabel =
    daysUntil === null ? null
    : daysUntil <= 0   ? "Starting today!"
    : daysUntil === 1  ? "1 day remaining"
    : `${daysUntil} days remaining`;

  if (!hasStarted && nextFixtureDate) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 text-center space-y-3">
        {competitionEmblem && (
          <img src={competitionEmblem} alt={competitionName} className="w-10 h-10 object-contain mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }} />
        )}
        <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          {isTournament ? "🏆 Tournament Starts Soon" : "⚽ Season Starts Soon"}
        </div>
        <p className="font-bold text-sm">{competitionName}</p>
        <div className="space-y-0.5">
          <p className="text-[11px] text-muted-foreground">{isTournament ? "Tournament begins" : "First fixture"}</p>
          <p className="font-semibold text-sm">{nextDateFormatted}</p>
        </div>
        {countdownLabel && (
          <div className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full">
            ⏰ {countdownLabel}
          </div>
        )}
      </div>
    );
  }

  if (hasStarted && nextFixtureDate) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 text-center space-y-3">
        <div className="text-3xl">📅</div>
        <p className="font-bold text-sm">Coming Soon</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          No matches scheduled in the next 10 days.
        </p>
        <div className="space-y-0.5">
          <p className="text-[11px] text-muted-foreground">Next match scheduled</p>
          <p className="font-semibold text-sm text-primary">{nextDateFormatted}</p>
        </div>
      </div>
    );
  }

  if (hasStarted && !nextFixtureDate) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 text-center space-y-3">
        <div className="text-3xl">🏁</div>
        <p className="font-bold text-sm">Season Completed</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          No remaining fixtures this season.<br />
          Check back when the new season schedule is released.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 text-center space-y-3">
      <div className="text-3xl">📋</div>
      <p className="font-bold text-sm">Schedule Not Announced</p>
      <p className="text-[11px] text-muted-foreground">Fixtures will appear here once announced.</p>
    </div>
  );
}

function KnockoutMatchCard({ match }: { match: LiveMatch }) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const date = new Date(match.matchDate);
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const homeWins = hasScore && match.homeScore! > match.awayScore!;
  const awayWins = hasScore && match.awayScore! > match.homeScore!;

  return (
    <div className={`bg-card border border-border rounded-xl p-3 text-sm transition-colors hover:border-primary/40 ${isLive ? "border-primary/60 bg-primary/5" : ""}`}>
      <div className="flex items-center justify-between mb-2.5">
        {isLive ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {match.minute ? `${match.minute}'` : "Live"}
          </span>
        ) : isFinished ? (
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Full Time</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">{dateStr}</span>
        )}
        {!isLive && !isFinished && (
          <span className="text-[10px] text-muted-foreground">{timeStr}</span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className={`flex items-center gap-2 ${homeWins ? "opacity-100" : awayWins ? "opacity-50" : "opacity-100"}`}>
          <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
          <span className={`flex-1 truncate text-xs ${homeWins ? "font-bold text-foreground" : "font-medium"}`}>{match.homeTeam.name}</span>
          {hasScore && (
            <span className={`tabular-nums font-bold text-sm w-5 text-right ${homeWins ? "text-foreground" : "text-muted-foreground"}`}>{match.homeScore}</span>
          )}
        </div>
        <div className={`flex items-center gap-2 ${awayWins ? "opacity-100" : homeWins ? "opacity-50" : "opacity-100"}`}>
          <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
          <span className={`flex-1 truncate text-xs ${awayWins ? "font-bold text-foreground" : "font-medium"}`}>{match.awayTeam.name}</span>
          {hasScore && (
            <span className={`tabular-nums font-bold text-sm w-5 text-right ${awayWins ? "text-foreground" : "text-muted-foreground"}`}>{match.awayScore}</span>
          )}
        </div>
      </div>

      {match.venue && (
        <p className="text-[10px] text-muted-foreground mt-2 truncate">{match.venue}</p>
      )}
    </div>
  );
}

function KnockoutView({ slug }: { slug: string }) {
  const { data, isLoading, isError, refetch } = useQuery<KnockoutData>({
    queryKey: ["live-knockout", slug],
    queryFn: () => apiFetch(`/api/live/knockout?leagueSlug=${slug}`),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });

  if (isLoading) return <TableSkeleton rows={8} cols={4} />;
  if (isError) return <ErrorState message="Knockout data unavailable" onRetry={() => refetch()} />;
  if (!data || data.rounds.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center space-y-3">
        <div className="text-4xl">🏆</div>
        <h3 className="font-bold text-lg">No Knockout Stage Data</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Knockout stage matches aren't available yet. They will appear here once the group stage is complete and knockout fixtures are confirmed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.isLive && (
        <div className="flex items-center gap-2 text-primary text-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Live knockout matches in progress
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-3 min-w-max">
          {data.rounds.map((round, roundIdx) => (
            <div key={round.stage} className="flex items-start gap-3">
              <div className="flex flex-col gap-2" style={{ width: "220px" }}>
                <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 text-center">
                  <span className="text-sm font-bold text-primary block">{round.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {round.matches.length} {round.matches.length === 1 ? "match" : "matches"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {round.matches.map(match => (
                    <KnockoutMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>

              {roundIdx < data.rounds.length - 1 && (
                <div className="flex items-center self-center mt-9 flex-shrink-0">
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
        <span className="flex items-center gap-1.5"><span className="font-bold text-foreground">Bold score</span> = Winner / Advancing</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" /> Live match</span>
      </div>
    </div>
  );
}

function GroupStageView({ standings, slug }: { standings: LiveStanding[]; slug: string }) {
  const isGrouped = standings.some(r => r.group != null);
  if (standings.length === 0) return <EmptyState message="No group stage standings available" />;

  if (!isGrouped) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-4 py-3">Club</th>
                <th className="text-center px-3 py-3 hidden sm:table-cell">P</th>
                <th className="text-center px-3 py-3 hidden md:table-cell">W</th>
                <th className="text-center px-3 py-3 hidden md:table-cell">D</th>
                <th className="text-center px-3 py-3 hidden md:table-cell">L</th>
                <th className="text-center px-3 py-3 hidden sm:table-cell">GD</th>
                <th className="text-center px-3 py-3 font-bold text-foreground">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {standings.map((row) => (
                <tr key={row.team.id} className={`hover:bg-secondary/50 transition-colors ${row.position <= 8 ? "border-l-2 border-l-primary" : ""}`}>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{row.position}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <img src={row.team.crest} alt={row.team.name} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                      <span className="font-semibold text-sm truncate max-w-[160px]">{row.team.name}</span>
                    </div>
                  </td>
                  <td className="text-center px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{row.played}</td>
                  <td className="text-center px-3 py-2.5 text-muted-foreground hidden md:table-cell">{row.won}</td>
                  <td className="text-center px-3 py-2.5 text-muted-foreground hidden md:table-cell">{row.drawn}</td>
                  <td className="text-center px-3 py-2.5 text-muted-foreground hidden md:table-cell">{row.lost}</td>
                  <td className={`text-center px-3 py-2.5 font-semibold hidden sm:table-cell ${row.goalDifference > 0 ? "text-primary" : row.goalDifference < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="text-center px-3 py-2.5 font-bold">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary rounded-full inline-block" /> Advance to knockout stage</span>
        </div>
      </div>
    );
  }

  const groupMap = new Map<string, LiveStanding[]>();
  for (const row of standings) {
    const key = row.group ?? "Group";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(row);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from(groupMap.entries()).map(([groupName, rows]) => (
        <div key={groupName} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border bg-secondary/30">
            <span className="text-xs font-bold uppercase tracking-wider">{groupName}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs border-b border-border">
                <th className="text-left px-3 py-1.5 w-6">#</th>
                <th className="text-left px-3 py-1.5">Club</th>
                <th className="text-center px-2 py-1.5">P</th>
                <th className="text-center px-2 py-1.5">GD</th>
                <th className="text-center px-2 py-1.5 font-bold text-foreground">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, idx) => (
                <tr key={row.team.id} className={`hover:bg-secondary/40 ${idx < 2 ? "border-l-2 border-l-primary" : ""}`}>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{row.position}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <img src={row.team.crest} alt={row.team.name} className="w-4 h-4 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                      <span className="font-medium text-xs truncate max-w-[80px]">{row.team.shortName}</span>
                    </div>
                  </td>
                  <td className="text-center px-2 py-2 text-muted-foreground text-xs">{row.played}</td>
                  <td className={`text-center px-2 py-2 text-xs font-semibold ${row.goalDifference > 0 ? "text-primary" : row.goalDifference < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="text-center px-2 py-2 font-bold text-xs">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function AllMatchesView({ liveMatches, upcomingMatches, recentMatches }: { liveMatches: LiveMatch[]; upcomingMatches: LiveMatch[]; recentMatches: LiveMatch[] }) {
  return (
    <div className="space-y-6">
      {liveMatches.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" /> Live Now
          </h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {liveMatches.map(m => <MatchRow key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {upcomingMatches.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />Upcoming</h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {upcomingMatches.map(m => <MatchRow key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {recentMatches.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Results</h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {recentMatches.map(m => <MatchRow key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {liveMatches.length === 0 && upcomingMatches.length === 0 && recentMatches.length === 0 && (
        <EmptyState message="No matches available for this competition" />
      )}
    </div>
  );
}

function TeamsView({ slug }: { slug: string }) {
  const { data, isLoading, isError, refetch } = useQuery<LiveTeam[]>({
    queryKey: ["live-teams", slug],
    queryFn: () => apiFetch(`/api/live/teams?leagueSlug=${slug}`),
    staleTime: 60 * 60_000,
    retry: 2,
  });

  if (isLoading) return <TableSkeleton rows={12} cols={3} />;
  if (isError) return <ErrorState message="Teams data unavailable" onRetry={() => refetch()} />;
  if (!data || data.length === 0) return <EmptyState message="No teams data for this competition" />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {data.map(team => (
        <div key={team.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
          <img src={team.crest} alt={team.name} className="w-10 h-10 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{team.name}</p>
            <p className="text-xs text-muted-foreground">
              {team.founded ? `Est. ${team.founded}` : ""}
              {team.founded && team.venue ? " · " : ""}
              {team.venue ? team.venue : ""}
            </p>
            {team.coach && (
              <p className="text-xs text-muted-foreground truncate">{team.coach}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeagueHub() {
  const { slug } = useParams<{ slug: string }>();
  const safeSlug = slug ?? "";
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const competition = COMPETITIONS.find(c => c.slug === safeSlug);
  const isTournament = TOURNAMENT_SLUGS.has(safeSlug);
  const isUnsupported = UNSUPPORTED_SLUGS.has(safeSlug);

  const { data, isLoading, isError, error, refetch } = useQuery<LeagueHubData>({
    queryKey: ["live-league-hub", safeSlug],
    queryFn: () => apiFetch(`/api/live/league-hub?leagueSlug=${safeSlug}`),
    enabled: !!safeSlug && !isUnsupported,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 2,
  });

  const leagueName = competition?.name ?? data?.competition.name ?? safeSlug;
  const emblem = competition?.emblem ?? data?.competition.emblem ?? "";

  if (isUnsupported) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-4">
          {emblem && <img src={emblem} alt={leagueName} className="w-16 h-16 object-contain" />}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{leagueName}</h1>
            <p className="text-muted-foreground mt-1">{competition?.country}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
          <div className="text-4xl">⚽</div>
          <h2 className="text-xl font-bold">Live data not available</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            {leagueName} is not covered by the free tier of football-data.org. Live standings, matches and scorers are only available for the top 5 European leagues, Champions League, Europa League, and FIFA World Cup.
          </p>
          <Link href="/standings" className="inline-block mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            View Supported Leagues
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-4">
          {emblem && <img src={emblem} alt={leagueName} className="w-16 h-16 object-contain" data-no-transition />}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{leagueName}</h1>
            <div className="h-4 w-32 bg-secondary rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2"><TableSkeleton rows={12} cols={5} /></div>
          <div><TableSkeleton rows={8} cols={3} /></div>
        </div>
      </div>
    );
  }

  if (isError) {
    const msg = (error as Error).message ?? "";
    const isNotSupported = msg.includes("not_supported") || msg.includes("404");
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-4">
          {emblem && <img src={emblem} alt={leagueName} className="w-16 h-16 object-contain" />}
          <h1 className="text-3xl font-bold tracking-tight">{leagueName}</h1>
        </div>
        {isNotSupported ? (
          <EmptyState message="This competition is not available on the current data plan." />
        ) : (
          <ErrorState message="Unable to load live league data from football-data.org." onRetry={() => refetch()} />
        )}
      </div>
    );
  }

  if (!data) return <EmptyState message="No data returned for this league." />;

  const { standings, liveMatches, upcomingMatches, recentMatches, scorers } = data;
  const nextMatches = [...liveMatches, ...upcomingMatches].slice(0, 6);
  const isGrouped = standings.some(r => r.group != null);

  return (
    <div className="space-y-6 pb-10">
      {/* Hero */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center p-3 shadow-md flex-shrink-0">
          <img src={data.competition.emblem} alt={data.competition.name} className="w-full h-full object-contain" data-no-transition onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
        </div>
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-0.5">{data.competition.country}</p>
          <h1 className="text-3xl md:text-4xl font-black">{data.competition.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {standings.length > 0 ? `${standings.length} teams` : ""}
            {liveMatches.length > 0 && <span className="text-primary font-semibold"> · {liveMatches.length} live now</span>}
            {isTournament && <span className="ml-1 text-xs font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Tournament</span>}
          </p>
        </div>
      </div>

      {/* Tab navigation — tournaments only */}
      {isTournament && (
        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── KNOCKOUT TAB ─── */}
      {isTournament && activeTab === "knockout" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-primary" />Knockout Stage</h2>
          </div>
          <KnockoutView slug={safeSlug} />
        </div>
      )}

      {/* ─── GROUP STAGE TAB ─── */}
      {isTournament && activeTab === "groups" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" />Group Stage</h2>
          <GroupStageView standings={standings} slug={safeSlug} />
        </div>
      )}

      {/* ─── ALL MATCHES TAB ─── */}
      {isTournament && activeTab === "matches" && (
        <AllMatchesView liveMatches={liveMatches} upcomingMatches={upcomingMatches} recentMatches={recentMatches} />
      )}

      {/* ─── TEAMS TAB ─── */}
      {isTournament && activeTab === "teams" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Teams</h2>
          <TeamsView slug={safeSlug} />
        </div>
      )}

      {/* ─── OVERVIEW TAB (default, also used for non-tournaments) ─── */}
      {(!isTournament || activeTab === "overview") && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left — standings + scorers */}
          <div className="xl:col-span-2 space-y-6">

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" />Standings</h2>
                <Link href={`/standings/${safeSlug}`} className="text-sm text-primary hover:underline font-medium">Full Table</Link>
              </div>

              {standings.length === 0 ? (
                <EmptyState message="Standings not available for this competition" />
              ) : isGrouped ? (
                (() => {
                  const groupMap = new Map<string, LiveStanding[]>();
                  for (const row of standings) {
                    const key = row.group ?? "Group";
                    if (!groupMap.has(key)) groupMap.set(key, []);
                    groupMap.get(key)!.push(row);
                  }
                  const groupEntries = Array.from(groupMap.entries());
                  const preview = groupEntries.slice(0, 4);
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {preview.map(([groupName, rows]) => (
                          <div key={groupName} className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="px-3 py-2 border-b border-border bg-secondary/30">
                              <span className="text-xs font-bold uppercase tracking-wider">{groupName}</span>
                            </div>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-muted-foreground text-xs border-b border-border">
                                  <th className="text-left px-3 py-1.5 w-6">#</th>
                                  <th className="text-left px-3 py-1.5">Club</th>
                                  <th className="text-center px-2 py-1.5">P</th>
                                  <th className="text-center px-2 py-1.5">GD</th>
                                  <th className="text-center px-2 py-1.5 font-bold text-foreground">Pts</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {rows.map((row, idx) => (
                                  <tr key={row.team.id} className={`hover:bg-secondary/40 ${idx < 2 ? "border-l-2 border-l-primary" : ""}`}>
                                    <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{row.position}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1.5">
                                        <img src={row.team.crest} alt={row.team.name} className="w-4 h-4 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                                        <span className="font-medium text-xs truncate max-w-[90px]">{row.team.shortName}</span>
                                      </div>
                                    </td>
                                    <td className="text-center px-2 py-2 text-muted-foreground text-xs">{row.played}</td>
                                    <td className={`text-center px-2 py-2 text-xs font-semibold ${row.goalDifference > 0 ? "text-primary" : row.goalDifference < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                                    </td>
                                    <td className="text-center px-2 py-2 font-bold text-xs">{row.points}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                      {groupEntries.length > 4 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing {preview.length} of {groupEntries.length} groups —{" "}
                          <button onClick={() => setActiveTab("groups")} className="text-primary hover:underline font-semibold">see all groups</button>
                        </p>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                          <th className="text-left px-4 py-3 w-8">#</th>
                          <th className="text-left px-4 py-3">Club</th>
                          <th className="text-center px-3 py-3 hidden sm:table-cell">P</th>
                          <th className="text-center px-3 py-3 hidden md:table-cell">W</th>
                          <th className="text-center px-3 py-3 hidden md:table-cell">D</th>
                          <th className="text-center px-3 py-3 hidden md:table-cell">L</th>
                          <th className="text-center px-3 py-3 hidden sm:table-cell">GD</th>
                          <th className="text-center px-3 py-3 font-bold text-foreground">Pts</th>
                          <th className="text-center px-3 py-3 hidden xl:table-cell">Form</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {standings.map((row) => {
                          const isTop4 = row.position <= 4;
                          const isBottom3 = standings.length - row.position < 3;
                          return (
                            <tr key={row.team.id} className={`transition-colors hover:bg-secondary/50 ${isTop4 ? "border-l-2 border-l-primary" : isBottom3 ? "border-l-2 border-l-destructive/50" : ""}`}>
                              <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{row.position}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <img src={row.team.crest} alt={row.team.name} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                                  <span className="font-semibold text-sm truncate max-w-[140px]" title={row.team.name}>{row.team.name}</span>
                                </div>
                              </td>
                              <td className="text-center px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{row.played}</td>
                              <td className="text-center px-3 py-2.5 text-muted-foreground hidden md:table-cell">{row.won}</td>
                              <td className="text-center px-3 py-2.5 text-muted-foreground hidden md:table-cell">{row.drawn}</td>
                              <td className="text-center px-3 py-2.5 text-muted-foreground hidden md:table-cell">{row.lost}</td>
                              <td className={`text-center px-3 py-2.5 font-semibold hidden sm:table-cell ${row.goalDifference > 0 ? "text-primary" : row.goalDifference < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                              </td>
                              <td className="text-center px-3 py-2.5 font-bold">{row.points}</td>
                              <td className="text-center px-3 py-2.5 hidden xl:table-cell">
                                {row.form ? (
                                  <div className="flex items-center justify-center gap-0.5">
                                    {row.form.split(",").filter(Boolean).slice(-5).map((r, i) => (
                                      <span key={i} className={`w-4 h-4 rounded-sm text-[10px] font-bold text-white flex items-center justify-center ${formColors[r.trim()] ?? "bg-muted"}`}>
                                        {r.trim().charAt(0)}
                                      </span>
                                    ))}
                                  </div>
                                ) : <span className="text-muted-foreground text-xs">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex gap-4">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary rounded-full inline-block" /> Champions League</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-destructive/50 rounded-full inline-block" /> Relegation</span>
                  </div>
                </div>
              )}
            </section>

            {scorers.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Top Scorers</h2>
                  <Link href="/players" className="text-sm text-primary hover:underline font-medium">All Scorers</Link>
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {scorers.slice(0, 8).map((s, i) => (
                    <div key={s.player.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <span className="w-6 text-center text-xs font-mono text-muted-foreground flex-shrink-0">{i + 1}</span>
                      <img src={s.team.crest} alt={s.team.shortName} className="w-6 h-6 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{s.player.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.team.name}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm flex-shrink-0">
                        <span className="font-bold text-primary text-base w-6 text-right">{s.goals}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">goals</span>
                        {s.assists !== null && <span className="text-xs text-muted-foreground hidden md:inline">{s.assists} ast</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right — live/upcoming + results */}
          <div className="space-y-6">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {liveMatches.length > 0
                    ? <><span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" /> Live & Upcoming</>
                    : "Upcoming"}
                </h2>
                {isTournament ? (
                  <button onClick={() => setActiveTab("matches")} className="text-sm text-primary hover:underline font-medium">All</button>
                ) : (
                  <Link href="/matches" className="text-sm text-primary hover:underline font-medium">All</Link>
                )}
              </div>
              {nextMatches.length > 0 ? (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {nextMatches.map(m => <MatchRow key={m.id} match={m} />)}
                </div>
              ) : (
                <SmartUpcomingPlaceholder
                  nextFixtureDate={data.nextFixtureDate ?? null}
                  hasStarted={data.hasStarted ?? false}
                  isTournament={isTournament}
                  competitionName={data.competition.name}
                  competitionEmblem={data.competition.emblem}
                />
              )}
            </section>

            {recentMatches.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Results</h2>
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {recentMatches.slice(0, 8).map(m => <MatchRow key={m.id} match={m} />)}
                </div>
              </section>
            )}

            {isTournament && (
              <section>
                <button
                  onClick={() => setActiveTab("knockout")}
                  className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Knockout Stage</p>
                    <p className="text-xs text-muted-foreground">View bracket & results →</p>
                  </div>
                </button>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
