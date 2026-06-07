import { useState } from "react";
import { useListMatches, useListLeagues } from "@workspace/api-client-react";
import { MatchCard } from "../components/MatchCard";
import { Link } from "wouter";

type StatusFilter = "all" | "live" | "upcoming" | "finished";

export default function Matches() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [leagueSlug, setLeagueSlug] = useState<string | undefined>(undefined);

  const params = {
    ...(status !== "all" ? { status: status as "live" | "upcoming" | "finished" } : {}),
    ...(leagueSlug ? { leagueSlug } : {}),
  };

  const { data: matches, isLoading } = useListMatches(params);
  const { data: leagues } = useListLeagues();

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
                status === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {opt.value === "live" && status === opt.value && (
                <span className="inline-block w-2 h-2 rounded-full bg-primary-foreground mr-1.5 animate-pulse" />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* League filter pills */}
      {leagues && leagues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setLeagueSlug(undefined)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              !leagueSlug ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            All Leagues
          </button>
          {leagues.map((league) => (
            <button
              key={league.slug}
              onClick={() => setLeagueSlug(league.slug)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                leagueSlug === league.slug ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <img src={league.logoUrl} alt="" className="w-3.5 h-3.5 object-contain" />
              {league.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : !matches || matches.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No matches found</p>
          <p className="text-sm">Try changing the filters above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} showLeague={!leagueSlug} />
          ))}
        </div>
      )}
    </div>
  );
}
