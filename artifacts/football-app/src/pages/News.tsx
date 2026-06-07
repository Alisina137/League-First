import { useState } from "react";
import { useListNews, useListLeagues } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function News() {
  const [leagueSlug, setLeagueSlug] = useState<string | undefined>(undefined);

  const { data: articles, isLoading } = useListNews(leagueSlug ? { leagueSlug } : {});
  const { data: leagues } = useListLeagues();

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-3xl font-bold tracking-tight">Latest News</h1>

      {/* League filter */}
      {leagues && (
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
      ) : !articles || articles.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No articles found</p>
          <p className="text-sm">Try a different league filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {articles.map((article, idx) => (
            <Link key={article.id} href={`/league/${article.leagueSlug}`} className="group block">
              <div className={`bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg ${idx === 0 ? "md:col-span-2 xl:col-span-2" : ""}`}>
                <div className="relative h-48 bg-muted overflow-hidden">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded">
                      {article.category}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                    <span className="text-xs text-white/80 font-medium">{article.leagueName}</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span className="font-medium">{article.source}</span>
                    <span>{format(new Date(article.publishedAt), "MMM d, yyyy")}</span>
                  </div>
                  <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
