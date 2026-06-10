import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, COMPETITIONS } from "../lib/liveApi";
import { Skeleton, ErrorState, EmptyState } from "../components/Skeleton";
import { format } from "date-fns";

interface NewsArticle {
  id: number;
  title: string;
  excerpt: string;
  imageUrl: string;
  publishedAt: string;
  source: string;
  leagueSlug: string;
  leagueName: string;
  category: string;
  url: string;
}

const REFRESH_MS = 30 * 60_000;

function NewsCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

export default function News() {
  const [leagueSlug, setLeagueSlug] = useState<string | undefined>();

  const qs = leagueSlug ? `?leagueSlug=${leagueSlug}` : "";
  const { data: articles, isLoading, isError, refetch } = useQuery<NewsArticle[]>({
    queryKey: ["news", leagueSlug],
    queryFn: () => apiFetch(`/api/news${qs}`),
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry: 2,
  });

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-3xl font-bold tracking-tight">Latest News</h1>

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <NewsCardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState message="News currently unavailable" onRetry={() => refetch()} />
      ) : !articles || articles.length === 0 ? (
        <EmptyState message="No news articles found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {articles.map((article) => (
            <a
              key={article.id}
              href={article.url && article.url !== "#" ? article.url : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg h-full flex flex-col">
                <div className="relative h-48 bg-muted overflow-hidden flex-shrink-0">
                  {article.imageUrl ? (
                    <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📰</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded">
                      {article.category}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 text-xs text-white/80 font-medium">{article.leagueName}</div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span className="font-medium">{article.source}</span>
                    <span>{format(new Date(article.publishedAt), "MMM d, yyyy")}</span>
                  </div>
                  <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2 flex-1">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
