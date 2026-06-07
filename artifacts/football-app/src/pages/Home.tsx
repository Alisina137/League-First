import { useGetHomepage } from "@workspace/api-client-react";
import { MatchCard } from "../components/MatchCard";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Home() {
  const { data: homepageData, isLoading, error } = useGetHomepage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !homepageData) {
    return <div className="text-destructive p-4 bg-destructive/10 rounded-lg border border-destructive/20">Failed to load homepage data.</div>;
  }

  return (
    <div className="space-y-10 pb-10">
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Live Matches
          </h2>
          <Link href="/matches" className="text-sm text-primary hover:underline font-medium">View All</Link>
        </div>
        {homepageData.liveMatches && homepageData.liveMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {homepageData.liveMatches.map((match) => (
              <MatchCard key={match.id} match={match} showLeague={true} />
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground p-8 bg-card rounded-lg border border-border text-center">
            No live matches right now.
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Upcoming Fixtures</h2>
          <Link href="/matches" className="text-sm text-primary hover:underline font-medium">View All</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {homepageData.upcomingMatches?.map((match) => (
            <MatchCard key={match.id} match={match} showLeague={true} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-10">
          <section>
            <h2 className="text-2xl font-bold mb-6">Top News</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {homepageData.topNews?.map((news) => (
                <Link key={news.id} href={`/league/${news.leagueSlug}`} className="group block">
                  <div className="bg-card border border-border rounded-lg overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
                    <div className="h-48 bg-muted relative overflow-hidden">
                      <img src={news.imageUrl} alt={news.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-black/70 text-white backdrop-blur-md rounded">
                          {news.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>{news.source}</span>
                        <span>{format(new Date(news.publishedAt), "MMM d, yyyy")}</span>
                      </div>
                      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">{news.title}</h3>
                      <p className="text-muted-foreground text-sm line-clamp-2">{news.excerpt}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-bold mb-6">Latest Transfers</h2>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="divide-y divide-border">
                {homepageData.transfers?.slice(0, 5).map((transfer) => (
                  <div key={transfer.id} className="p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border border-border">
                        <img src={transfer.playerPhoto} alt={transfer.playerName} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{transfer.playerName}</div>
                        <div className="text-xs text-muted-foreground font-medium">{transfer.fee}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        {transfer.fromTeamLogo && <img src={transfer.fromTeamLogo} className="w-4 h-4 object-contain" alt="" />}
                        <span className="truncate max-w-[80px]">{transfer.fromTeam}</span>
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <div className="flex items-center gap-1 font-semibold text-primary">
                        {transfer.toTeamLogo && <img src={transfer.toTeamLogo} className="w-4 h-4 object-contain" alt="" />}
                        <span className="truncate max-w-[80px]">{transfer.toTeam}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/transfers" className="block w-full text-center p-3 text-sm font-semibold text-primary hover:bg-secondary transition-colors border-t border-border">
                View All Transfers
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
