import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, COMPETITIONS, ageFromDob, normalizePosition, type LiveScorer } from "../lib/liveApi";
import { TableSkeleton, ErrorState, EmptyState } from "../components/Skeleton";

const REFRESH_MS = 30 * 60 * 1000;

const positionColors: Record<string, string> = {
  FW: "bg-red-500/20 text-red-400",
  MF: "bg-blue-500/20 text-blue-400",
  DF: "bg-yellow-500/20 text-yellow-400",
  GK: "bg-green-500/20 text-green-400",
};

export default function Players() {
  const [slug, setSlug] = useState("premier-league");

  const { data, isLoading, isError, refetch } = useQuery<LiveScorer[]>({
    queryKey: ["live-scorers", slug],
    queryFn: () => apiFetch(`/api/live/scorers?leagueSlug=${slug}`),
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry: 2,
  });

  const comp = COMPETITIONS.find(c => c.slug === slug);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Top Scorers</h1>
        {comp && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <img src={comp.emblem} alt="" className="w-5 h-5 object-contain" />
            {comp.name}
          </div>
        )}
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
        <TableSkeleton rows={20} cols={5} />
      ) : isError ? (
        <ErrorState message="Scorers currently unavailable" onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState message="No scorer data for this competition" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 w-8">#</th>
                  <th className="text-left px-4 py-3">Player</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Club</th>
                  <th className="text-center px-4 py-3">Goals</th>
                  <th className="text-center px-4 py-3 hidden md:table-cell">Assists</th>
                  <th className="text-center px-4 py-3 hidden lg:table-cell">Apps</th>
                  <th className="text-center px-4 py-3 hidden lg:table-cell">Pens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((scorer, idx) => {
                  const pos = normalizePosition(scorer.player.position);
                  const age = scorer.player.dateOfBirth ? ageFromDob(scorer.player.dateOfBirth) : null;
                  return (
                    <tr key={scorer.player.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-lg flex-shrink-0">
                            ⚽
                          </div>
                          <div>
                            <div className="font-semibold">{scorer.player.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${positionColors[pos] ?? "bg-muted text-muted-foreground"}`}>{pos}</span>
                              <span className="text-xs text-muted-foreground">{scorer.player.nationality}</span>
                              {age && <span className="text-xs text-muted-foreground">· {age}y</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <img src={scorer.team.crest} alt={scorer.team.name} className="w-4 h-4 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          <span className="text-muted-foreground text-xs">{scorer.team.shortName}</span>
                        </div>
                      </td>
                      <td className="text-center px-4 py-3 font-bold text-primary text-lg">{scorer.goals}</td>
                      <td className="text-center px-4 py-3 text-muted-foreground hidden md:table-cell">{scorer.assists ?? "—"}</td>
                      <td className="text-center px-4 py-3 text-muted-foreground hidden lg:table-cell">{scorer.playedMatches}</td>
                      <td className="text-center px-4 py-3 text-muted-foreground hidden lg:table-cell">{scorer.penalties ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
