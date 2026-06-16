import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiFetch, COMPETITIONS, type LiveMatch, type LiveStanding, type Competition } from "../lib/liveApi";
import { MatchCardSkeleton, Skeleton, ErrorState } from "../components/Skeleton";
import { UpcomingEmptyState } from "../components/UpcomingEmptyState";

interface LiveHomepage {
  liveMatches: LiveMatch[];
  upcomingMatches: LiveMatch[];
  featuredStandings: LiveStanding[];
  competitions: Competition[];
  nextFixtureDate: string | null;
  hasStarted: boolean;
}

function matchLink(m: LiveMatch) {
  return `/match/${m.id}?league=${encodeURIComponent(m.leagueSlug)}`;
}

function useCountdownStr(target: string): string | null {
  const calc = () => {
    const ms = new Date(target).getTime() - Date.now();
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    if (h >= 24) {
      const d = Math.floor(h / 24);
      return `${d}d ${h % 24}h : ${String(m).padStart(2,"0")}m : ${String(s).padStart(2,"0")}s`;
    }
    return `${String(h).padStart(2,"0")}h : ${String(m).padStart(2,"0")}m : ${String(s).padStart(2,"0")}s`;
  };
  const [cd, setCd] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setCd(calc()), 1000);
    return () => clearInterval(t);
  }, [target]);
  return cd;
}

function LiveMatchCard({ match }: { match: LiveMatch }) {
  return (
    <Link href={matchLink(match)}>
      <div className="group bg-card border border-primary/40 rounded-xl overflow-hidden hover:border-primary hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/40 border-b border-border">
          <div className="flex items-center gap-1.5 min-w-0">
            <img src={match.leagueEmblem} alt="" className="w-4 h-4 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="text-xs text-muted-foreground font-medium truncate max-w-[120px]">{match.leagueName}</span>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {match.minute
              ? `${match.period && match.period !== "1H" && match.period !== "2H" && match.period !== "LIVE" ? `${match.period} ` : ""}${match.minute}'`
              : match.period ?? "LIVE"}
          </span>
        </div>
        {/* Teams */}
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
            <span className="font-semibold text-xs text-center line-clamp-2 leading-tight">{match.homeTeam.shortName ?? match.homeTeam.name}</span>
          </div>
          <div className="flex flex-col items-center flex-shrink-0 gap-0.5">
            <span className="text-xl font-black tabular-nums text-primary">{match.homeScore ?? 0} – {match.awayScore ?? 0}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
            <span className="font-semibold text-xs text-center line-clamp-2 leading-tight">{match.awayTeam.shortName ?? match.awayTeam.name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function UpcomingFixtureCard({ match }: { match: LiveMatch }) {
  const countdown = useCountdownStr(match.matchDate);
  const date = new Date(match.matchDate);
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <Link href={matchLink(match)}>
      <div className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
        {/* Header bar: competition + date */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/30 border-b border-border">
          <div className="flex items-center gap-1.5 min-w-0">
            <img src={match.leagueEmblem} alt="" className="w-4 h-4 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="text-xs font-semibold text-muted-foreground truncate">{match.leagueName}</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground flex-shrink-0 ml-2">
            {dateStr} · {timeStr}
          </span>
        </div>

        {/* Teams */}
        <div className="px-4 py-5 flex items-center gap-2">
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-12 h-12 object-contain drop-shadow-sm" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
            <span className="font-bold text-xs text-center line-clamp-2 leading-snug">{match.homeTeam.shortName ?? match.homeTeam.name}</span>
          </div>

          <div className="flex flex-col items-center flex-shrink-0 px-2 gap-0.5">
            <span className="text-base font-black text-muted-foreground">vs</span>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-12 h-12 object-contain drop-shadow-sm" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
            <span className="font-bold text-xs text-center line-clamp-2 leading-snug">{match.awayTeam.shortName ?? match.awayTeam.name}</span>
          </div>
        </div>

        {/* Countdown footer */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-center gap-1.5 bg-primary/5 group-hover:bg-primary/10 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
          <span className="text-xs font-bold text-primary tabular-nums">
            {countdown ?? "Match Started"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function StandingsMini({ standings }: { standings: LiveStanding[] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="https://crests.football-data.org/PL.png" alt="PL" className="w-5 h-5 object-contain" />
          <span className="font-bold text-sm">Premier League</span>
        </div>
        <Link href="/standings" className="text-xs text-primary hover:underline">Full table</Link>
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-border">
          {standings.map((row) => (
            <tr key={row.team.id} className="hover:bg-secondary/30 transition-colors">
              <td className="px-3 py-2 text-muted-foreground w-6">{row.position}</td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-1.5">
                  <img src={row.team.crest} alt="" className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                  <span className="font-medium">{row.team.shortName ?? row.team.name}</span>
                </div>
              </td>
              <td className="px-2 py-2 text-muted-foreground text-center">{row.played}</td>
              <td className="px-3 py-2 font-bold text-center">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Home() {
  const { data, isLoading, isError, refetch } = useQuery<LiveHomepage>({
    queryKey: ["live-homepage"],
    queryFn: () => apiFetch("/api/live/homepage"),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="space-y-10 pb-10">
        <section>
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <MatchCardSkeleton key={i} />)}
          </div>
        </section>
        <section>
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <MatchCardSkeleton key={i} />)}
          </div>
        </section>
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Could not load homepage data" onRetry={() => refetch()} />;
  }

  const { liveMatches = [], upcomingMatches = [], featuredStandings = [], nextFixtureDate = null, hasStarted = true } = data ?? {};

  const upcomingToShow = upcomingMatches
    .slice()
    .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-10 pb-10">
      {/* Live matches */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Live Now
          </h2>
          <Link href="/matches?status=live" className="text-sm text-primary hover:underline font-medium">View all</Link>
        </div>
        {liveMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {liveMatches.map((m) => <LiveMatchCard key={m.id} match={m} />)}
          </div>
        ) : (
          <div className="text-muted-foreground p-8 bg-card rounded-xl border border-border text-center">
            <p className="text-base font-medium">No live matches right now</p>
            <p className="text-sm mt-1">Check back during match days</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming fixtures (2/3 width) */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Upcoming Fixtures</h2>
            <Link
              href="/matches?status=upcoming"
              className="text-sm text-primary hover:underline font-medium"
            >
              View All
            </Link>
          </div>

          {upcomingToShow.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcomingToShow.map((m) => <UpcomingFixtureCard key={m.id} match={m} />)}
            </div>
          ) : (
            <UpcomingEmptyState
              nextFixtureDate={nextFixtureDate}
              hasStarted={hasStarted}
              context="global"
            />
          )}
        </div>

        {/* Sidebar: PL standings + competitions */}
        <div className="space-y-6">
          {featuredStandings.length > 0 && (
            <StandingsMini standings={featuredStandings} />
          )}

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="font-bold text-sm">Competitions</span>
            </div>
            <div className="divide-y divide-border">
              {COMPETITIONS.map((comp) => (
                <Link key={comp.slug} href={`/league/${comp.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors group">
                  <img src={comp.emblem} alt={comp.name} className="w-6 h-6 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{comp.name}</p>
                    <p className="text-xs text-muted-foreground">{comp.country}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
