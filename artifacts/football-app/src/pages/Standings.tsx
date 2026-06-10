import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, COMPETITIONS, type LiveStanding } from "../lib/liveApi";
import { TableSkeleton, ErrorState, EmptyState } from "../components/Skeleton";

const REFRESH_MS = 15 * 60 * 1000;

const formColors: Record<string, string> = {
  W: "bg-green-500",
  D: "bg-yellow-500",
  L: "bg-red-500",
};

function groupStandings(rows: LiveStanding[]): Map<string | undefined, LiveStanding[]> {
  const map = new Map<string | undefined, LiveStanding[]>();
  for (const row of rows) {
    const key = row.group;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return map;
}

function StandingsTable({ rows, showForm = true }: { rows: LiveStanding[]; showForm?: boolean }) {
  return (
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
            <th className="text-center px-3 py-3 hidden lg:table-cell">GF</th>
            <th className="text-center px-3 py-3 hidden lg:table-cell">GA</th>
            <th className="text-center px-3 py-3 hidden sm:table-cell">GD</th>
            <th className="text-center px-3 py-3 font-bold text-foreground">Pts</th>
            {showForm && <th className="text-center px-3 py-3 hidden xl:table-cell">Form</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const isTop2 = row.position <= 2;
            const isBottom2 = rows.length - row.position < 2;
            return (
              <tr
                key={row.team.id}
                className={`transition-colors hover:bg-secondary/50 ${
                  isTop2 ? "border-l-2 border-l-primary" : isBottom2 ? "border-l-2 border-l-destructive/50" : ""
                }`}
              >
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{row.position}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <img src={row.team.crest} alt={row.team.name} className="w-6 h-6 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                    <span className="font-semibold">{row.team.name}</span>
                  </div>
                </td>
                <td className="text-center px-3 py-3 text-muted-foreground hidden sm:table-cell">{row.played}</td>
                <td className="text-center px-3 py-3 text-muted-foreground hidden md:table-cell">{row.won}</td>
                <td className="text-center px-3 py-3 text-muted-foreground hidden md:table-cell">{row.drawn}</td>
                <td className="text-center px-3 py-3 text-muted-foreground hidden md:table-cell">{row.lost}</td>
                <td className="text-center px-3 py-3 text-muted-foreground hidden lg:table-cell">{row.goalsFor}</td>
                <td className="text-center px-3 py-3 text-muted-foreground hidden lg:table-cell">{row.goalsAgainst}</td>
                <td className={`text-center px-3 py-3 font-semibold hidden sm:table-cell ${row.goalDifference > 0 ? "text-primary" : row.goalDifference < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </td>
                <td className="text-center px-3 py-3 font-bold text-foreground">{row.points}</td>
                {showForm && (
                  <td className="text-center px-3 py-3 hidden xl:table-cell">
                    {row.form ? (
                      <div className="flex items-center justify-center gap-0.5">
                        {row.form.split(",").filter(Boolean).slice(-5).map((r, i) => (
                          <span key={i} className={`w-4 h-4 rounded-sm text-[10px] font-bold text-white flex items-center justify-center ${formColors[r.trim()] ?? "bg-muted"}`}>
                            {r.trim().charAt(0)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Standings() {
  const { slug: urlSlug } = useParams<{ slug?: string }>();
  const [, navigate] = useLocation();
  const slug = urlSlug ?? "premier-league";

  const { data, isLoading, isError, refetch } = useQuery<LiveStanding[]>({
    queryKey: ["live-standings", slug],
    queryFn: () => {
      console.log(`Selected: ${COMPETITIONS.find(c => c.slug === slug)?.name ?? slug} | Competition ID: ${slug} | Standings Endpoint: /api/live/standings?leagueSlug=${slug}`);
      return apiFetch(`/api/live/standings?leagueSlug=${slug}`);
    },
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry: 2,
  });

  const isMultiGroup = data && data.length > 0 && data.some(r => r.group != null);
  const groups = isMultiGroup ? groupStandings(data!) : null;

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-3xl font-bold tracking-tight">Standings</h1>

      <div className="flex flex-wrap gap-2">
        {COMPETITIONS.map((comp) => (
          <button
            key={comp.slug}
            onClick={() => navigate(`/standings/${comp.slug}`)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              slug === comp.slug
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <img src={comp.emblem} alt="" className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            {comp.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton rows={20} cols={7} />
      ) : isError ? (
        <ErrorState message="Standings currently unavailable" onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState message="No standings data for this competition" />
      ) : groups ? (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([groupName, rows]) => (
            <div key={groupName ?? "group"} className="bg-card border border-border rounded-xl overflow-hidden">
              {groupName && (
                <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">{groupName}</h3>
                </div>
              )}
              <StandingsTable rows={rows} showForm={false} />
              <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex gap-4">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary rounded-full inline-block" /> Advance to Knockout</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <StandingsTable rows={data} />
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex gap-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary rounded-full inline-block" /> Champions League</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-destructive/50 rounded-full inline-block" /> Relegation</span>
          </div>
        </div>
      )}
    </div>
  );
}
