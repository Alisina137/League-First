import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, COMPETITIONS, type LiveStanding, type LiveMatch, type LiveScorer } from "../lib/liveApi";
import { TableSkeleton, ErrorState, EmptyState } from "../components/Skeleton";
import { Trophy, Calendar, Users, TrendingUp } from "lucide-react";

interface LeagueHubData {
  competition: {
    slug: string;
    code: string;
    name: string;
    country: string;
    emblem: string;
  };
  standings: LiveStanding[];
  liveMatches: LiveMatch[];
  upcomingMatches: LiveMatch[];
  recentMatches: LiveMatch[];
  scorers: LiveScorer[];
}

const formColors: Record<string, string> = {
  W: "bg-green-500",
  D: "bg-yellow-500",
  L: "bg-red-500",
};

const UNSUPPORTED_SLUGS = new Set(["saudi-pro-league", "mls"]);

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

export default function LeagueHub() {
  const { slug } = useParams<{ slug: string }>();
  const safeSlug = slug ?? "";

  const competition = COMPETITIONS.find(c => c.slug === safeSlug);
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
            {leagueName} is not covered by the free tier of football-data.org.
            Live standings, matches and scorers are only available for the top 5 European leagues, Champions League, Europa League, and FIFA World Cup.
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

  return (
    <div className="space-y-8 pb-10">
      {/* Hero */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center p-3 shadow-md flex-shrink-0">
          <img src={data.competition.emblem} alt={data.competition.name} className="w-full h-full object-contain" data-no-transition onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
        </div>
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-0.5">{data.competition.country}</p>
          <h1 className="text-3xl md:text-4xl font-black">{data.competition.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {standings.length > 0 ? `${standings.length} teams` : ""}{" "}
            {liveMatches.length > 0 && <span className="text-primary font-semibold">· {liveMatches.length} live now</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left column — standings */}
        <div className="xl:col-span-2 space-y-6">

          {/* Standings table */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" />Standings</h2>
              <Link href={`/standings`} className="text-sm text-primary hover:underline font-medium">Full Table</Link>
            </div>
            {standings.length === 0 ? (
              <EmptyState message="Standings not available for this competition" />
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
                          <tr
                            key={row.team.id}
                            className={`transition-colors hover:bg-secondary/50 ${
                              isTop4 ? "border-l-2 border-l-primary" : isBottom3 ? "border-l-2 border-l-destructive/50" : ""
                            }`}
                          >
                            <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{row.position}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <img src={row.team.crest} alt={row.team.name} className="w-5 h-5 object-contain flex-shrink-0" data-no-transition onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
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

          {/* Top Scorers */}
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
                    <img src={s.team.crest} alt={s.team.shortName} className="w-6 h-6 object-contain flex-shrink-0" data-no-transition onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{s.player.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.team.name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm flex-shrink-0">
                      <span className="font-bold text-primary text-base w-6 text-right">{s.goals}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">goals</span>
                      {s.assists !== null && (
                        <span className="text-xs text-muted-foreground hidden md:inline">{s.assists} ast</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right column — matches */}
        <div className="space-y-6">

          {/* Live / Upcoming */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {liveMatches.length > 0 ? (
                  <><span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" /> Live & Upcoming</>
                ) : "Upcoming"}
              </h2>
              <Link href="/matches" className="text-sm text-primary hover:underline font-medium">All</Link>
            </div>
            {nextMatches.length === 0 ? (
              <EmptyState message="No upcoming fixtures" />
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {nextMatches.map(m => <MatchRow key={m.id} match={m} />)}
              </div>
            )}
          </section>

          {/* Recent results */}
          {recentMatches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />Results
                </h2>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {recentMatches.slice(0, 8).map(m => <MatchRow key={m.id} match={m} />)}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
