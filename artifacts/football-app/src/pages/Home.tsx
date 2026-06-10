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

function MatchCard({ match }: { match: LiveMatch }) {
  const isLive = match.status === "live";
  const isUpcoming = match.status === "upcoming";
  const date = new Date(match.matchDate);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <div className={`bg-card border rounded-xl p-4 transition-all hover:border-primary/40 ${isLive ? "border-primary/50 shadow-[0_0_12px_rgba(0,179,131,0.12)]" : "border-border"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <img src={match.leagueEmblem} alt="" className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <span className="text-xs text-muted-foreground font-medium truncate max-w-[110px]">{match.leagueName}</span>
        </div>
        {isLive ? (
          <span className="flex items-center gap-1 text-xs font-bold text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {match.minute ? `${match.minute}'` : "LIVE"}
          </span>
        ) : isUpcoming ? (
          <span className="text-xs text-muted-foreground">{dateStr} · {timeStr}</span>
        ) : (
          <span className="text-xs text-muted-foreground">FT</span>
        )}
      </div>
      <div className="space-y-2">
        {[
          { team: match.homeTeam, score: match.homeScore },
          { team: match.awayTeam, score: match.awayScore },
        ].map(({ team, score }, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src={team.crest} alt={team.name} className="w-6 h-6 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
              <span className="font-semibold text-sm truncate">{team.shortName ?? team.name}</span>
            </div>
            <span className={`text-lg font-bold tabular-nums ml-2 ${isLive ? "text-primary" : "text-foreground"}`}>
              {score !== null ? score : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <MatchCardSkeleton key={i} />)}
          </div>
        </section>
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Could not load homepage data" onRetry={() => refetch()} />;
  }

  const { liveMatches = [], upcomingMatches = [], featuredStandings = [], nextFixtureDate = null, hasStarted = true } = data ?? {};

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
            {liveMatches.map((m) => <MatchCard key={m.id} match={m} />)}
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
            <Link href="/matches" className="text-sm text-primary hover:underline font-medium">View all</Link>
          </div>
          {upcomingMatches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcomingMatches.slice(0, 12).map((m) => <MatchCard key={m.id} match={m} />)}
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
