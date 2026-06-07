import { useGetLeagueSummary, getGetLeagueSummaryQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { MatchCard } from "../components/MatchCard";
import { format } from "date-fns";

export default function LeagueHub() {
  const { slug } = useParams<{ slug: string }>();
  const { data: summary, isLoading, error } = useGetLeagueSummary(slug || "", {
    query: { enabled: !!slug, queryKey: getGetLeagueSummaryQueryKey(slug || "") }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !summary) {
    return <div className="text-destructive p-4 bg-destructive/10 rounded-lg border border-destructive/20">Failed to load league data.</div>;
  }

  return (
    <div className="space-y-10 pb-10">
      <div className="relative rounded-xl overflow-hidden bg-card border border-border">
        <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 right-0 bottom-0 w-2/3 bg-primary/5 opacity-50 blur-3xl pointer-events-none" />
        <div className="relative z-20 p-8 flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 shadow-2xl flex items-center justify-center">
              <img src={summary.league.logoUrl} alt={summary.league.name} className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-primary font-bold tracking-widest text-sm uppercase mb-1">
                {summary.league.country}
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-2 text-white drop-shadow-md">
                {summary.league.name}
              </h1>
              <div className="text-muted-foreground font-medium flex items-center gap-3">
                <span>{summary.league.currentSeason} Season</span>
                <span className="w-1.5 h-1.5 rounded-full bg-border" />
                <span>Matchweek {summary.league.currentMatchweek}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-10">
          {(summary.liveMatches?.length > 0 || summary.upcomingMatches?.length > 0) && (
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                {summary.liveMatches?.length > 0 && <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
                Matches
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary.liveMatches?.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
                {summary.upcomingMatches?.slice(0, 4 - (summary.liveMatches?.length || 0)).map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Recent Results</h2>
              <Link href="/matches" className="text-sm text-primary hover:underline font-medium">View All</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.recentResults?.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-bold mb-6">Standings</h2>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-muted-foreground">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium">#</th>
                      <th className="py-3 px-2 text-left font-medium">Team</th>
                      <th className="py-3 px-2 text-center font-medium">P</th>
                      <th className="py-3 px-2 text-center font-medium">GD</th>
                      <th className="py-3 px-4 text-right font-medium">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.standings?.slice(0, 10).map((row) => (
                      <tr key={row.team.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 text-left font-medium text-muted-foreground">{row.position}</td>
                        <td className="py-3 px-2 text-left">
                          <div className="flex items-center gap-2">
                            <img src={row.team.logoUrl} className="w-5 h-5 object-contain" alt="" />
                            <span className="font-semibold truncate max-w-[100px]" title={row.team.name}>{row.team.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-muted-foreground">{row.played}</td>
                        <td className="py-3 px-2 text-center text-muted-foreground">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                        <td className="py-3 px-4 text-right font-bold">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link href="/standings" className="block w-full text-center p-3 text-sm font-semibold text-primary hover:bg-secondary transition-colors border-t border-border">
                Full Standings
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
