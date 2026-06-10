import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, COMPETITIONS, type LiveTeam } from "../lib/liveApi";
import { CardSkeleton, ErrorState, EmptyState } from "../components/Skeleton";

const REFRESH_MS = 60 * 60 * 1000;

export default function Teams() {
  const [slug, setSlug] = useState("premier-league");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery<LiveTeam[]>({
    queryKey: ["live-teams", slug],
    queryFn: () => apiFetch(`/api/live/teams?leagueSlug=${slug}`),
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry: 2,
  });

  const filtered = (data ?? []).filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.shortName.toLowerCase().includes(search.toLowerCase())
  );

  const comp = COMPETITIONS.find(c => c.slug === slug);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
        <input
          type="search"
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-full sm:w-64"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {COMPETITIONS.map((c) => (
          <button
            key={c.slug}
            onClick={() => setSlug(c.slug)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              slug === c.slug ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <img src={c.emblem} alt="" className="w-3.5 h-3.5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            {c.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 20 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState message="Teams currently unavailable" onRetry={() => refetch()} />
      ) : !filtered.length ? (
        <EmptyState message={search ? "No teams match your search" : "No teams found for this league"} />
      ) : (
        <>
          {comp && (
            <p className="text-sm text-muted-foreground">{filtered.length} clubs in {comp.name}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((team) => (
              <div key={team.id} className="group bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-3 text-center hover:border-primary/50 hover:bg-secondary/30 transition-all">
                <div className="w-14 h-14 flex items-center justify-center">
                  <img
                    src={team.crest}
                    alt={team.name}
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                  />
                </div>
                <div className="w-full">
                  <p className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{team.name}</p>
                  {team.venue && <p className="text-xs text-muted-foreground mt-0.5 truncate">{team.venue}</p>}
                  {team.coach && <p className="text-xs text-muted-foreground mt-0.5 truncate">🧑‍💼 {team.coach}</p>}
                  {team.founded && <p className="text-xs text-muted-foreground/60 mt-0.5">Est. {team.founded}</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
