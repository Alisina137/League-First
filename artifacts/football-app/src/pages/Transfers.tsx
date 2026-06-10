import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, COMPETITIONS } from "../lib/liveApi";
import { Skeleton, ErrorState, EmptyState } from "../components/Skeleton";
import { format } from "date-fns";

interface Transfer {
  id: number;
  playerName: string;
  playerPhoto: string;
  fromTeam: string;
  fromTeamLogo: string;
  toTeam: string;
  toTeamLogo: string;
  fee: string;
  transferDate: string;
  leagueSlug: string;
  leagueName: string;
  type: string;
}

const REFRESH_MS = 6 * 60 * 60_000;

function TransferSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

const typeColors: Record<string, string> = {
  permanent: "bg-primary/20 text-primary",
  loan: "bg-blue-500/20 text-blue-400",
  free: "bg-muted text-muted-foreground",
};

export default function Transfers() {
  const [leagueSlug, setLeagueSlug] = useState<string | undefined>();

  const qs = leagueSlug ? `?leagueSlug=${leagueSlug}` : "";
  const { data: transfers, isLoading, isError, refetch } = useQuery<Transfer[]>({
    queryKey: ["transfers", leagueSlug],
    queryFn: () => apiFetch(`/api/transfers${qs}`),
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry: 2,
  });

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-3xl font-bold tracking-tight">Transfer News</h1>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <TransferSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState message="Transfers currently unavailable" onRetry={() => refetch()} />
      ) : !transfers || transfers.length === 0 ? (
        <EmptyState message="No transfers found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {transfers.map((t) => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0 flex items-center justify-center text-xl">
                  {t.playerPhoto ? (
                    <img src={t.playerPhoto} alt={t.playerName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : "👤"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base">{t.playerName}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${typeColors[t.type] ?? typeColors.free}`}>
                      {t.type}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(t.transferDate), "MMM d, yyyy")} · {t.fee}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {t.fromTeamLogo && <img src={t.fromTeamLogo} alt="" className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                  <span className="text-sm text-muted-foreground truncate">{t.fromTeam}</span>
                </div>
                <span className="text-muted-foreground font-bold">→</span>
                <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                  <span className="text-sm font-semibold text-primary truncate">{t.toTeam}</span>
                  {t.toTeamLogo && <img src={t.toTeamLogo} alt="" className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">{t.leagueName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
