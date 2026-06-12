import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch, Link } from "wouter";
import { apiFetch, COMPETITIONS, type LiveMatch } from "../lib/liveApi";
import { MatchCardSkeleton, ErrorState, EmptyState } from "../components/Skeleton";
import { UpcomingEmptyState } from "../components/UpcomingEmptyState";

type StatusFilter = "all" | "live" | "upcoming" | "finished";

const REFRESH: Record<StatusFilter, number> = {
  live: 60_000,
  upcoming: 5 * 60_000,
  finished: 30 * 60_000,
  all: 60_000,
};

function MatchCard({ match }: { match: LiveMatch }) {
  const isLive = match.status === "live";
  const isUpcoming = match.status === "upcoming";
  const date = new Date(match.matchDate);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
  const href = `/match/${match.id}?league=${encodeURIComponent(match.leagueSlug)}`;

  return (
    <Link href={href}>
      <div className={`group bg-card border rounded-xl p-4 transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${isLive ? "border-primary/50 shadow-[0_0_12px_rgba(0,179,131,0.12)]" : "border-border"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <img src={match.leagueEmblem} alt={match.leagueName} className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="text-xs text-muted-foreground font-medium truncate max-w-[120px]">{match.leagueName}</span>
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
                {score !== null ? score : isUpcoming ? "-" : "?"}
              </span>
            </div>
          ))}
        </div>

        {match.venue && (
          <p className="mt-2 text-xs text-muted-foreground truncate">📍 {match.venue}</p>
        )}
      </div>
    </Link>
  );
}

const VALID_STATUSES = new Set<StatusFilter>(["all", "live", "upcoming", "finished"]);

function parseStatus(search: string): StatusFilter {
  const param = new URLSearchParams(search).get("status") as StatusFilter | null;
  return param && VALID_STATUSES.has(param) ? param : "all";
}

export default function Matches() {
  const search = useSearch();
  const [status, setStatus] = useState<StatusFilter>(() => parseStatus(search));
  const [leagueSlug, setLeagueSlug] = useState<string | undefined>();

  const qs = new URLSearchParams();
  if (status !== "all") qs.set("status", status);
  if (leagueSlug) qs.set("leagueSlug", leagueSlug);

  const { data, isLoading, isError, refetch } = useQuery<LiveMatch[]>({
    queryKey: ["live-matches", status, leagueSlug],
    queryFn: () => apiFetch(`/api/live/matches?${qs}`),
    staleTime: REFRESH[status],
    refetchInterval: REFRESH[status],
    retry: 2,
  });

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "live", label: "Live" },
    { value: "upcoming", label: "Upcoming" },
    { value: "finished", label: "Results" },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                status === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {opt.value === "live" && (
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${status === "live" ? "bg-primary-foreground animate-pulse" : "bg-primary"}`} />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setLeagueSlug(undefined)}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${!leagueSlug ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
        >
          All Leagues
        </button>
        {COMPETITIONS.map((c) => (
          <button
            key={c.slug}
            onClick={() => setLeagueSlug(c.slug)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              leagueSlug === c.slug ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <img src={c.emblem} alt="" className="w-3.5 h-3.5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            {c.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <MatchCardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState message="Matches currently unavailable" onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        (status === "upcoming" || status === "all") ? (
          <UpcomingEmptyState context="global" hasStarted={true} />
        ) : (
          <EmptyState message={status === "live" ? "No live matches right now" : "No matches found for this filter"} />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
      )}
    </div>
  );
}
