import { useState } from "react";
import { useListTransfers, useListLeagues } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Transfers() {
  const [leagueSlug, setLeagueSlug] = useState<string | undefined>(undefined);

  const { data: transfers, isLoading } = useListTransfers(leagueSlug ? { leagueSlug } : {});
  const { data: leagues } = useListLeagues();

  const typeColors: Record<string, string> = {
    permanent: "bg-primary/20 text-primary",
    loan: "bg-blue-500/20 text-blue-400",
    free: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-3xl font-bold tracking-tight">Transfer News</h1>

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
      ) : !transfers || transfers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No transfers found</p>
          <p className="text-sm">Try a different league filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {transfers.map((transfer) => (
            <div key={transfer.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
                  <img src={transfer.playerPhoto} alt={transfer.playerName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48'; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base">{transfer.playerName}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${typeColors[transfer.type] ?? typeColors.free}`}>
                      {transfer.type}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(transfer.transferDate), "MMM d, yyyy")} • {transfer.fee}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <img src={transfer.fromTeamLogo} alt={transfer.fromTeam} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="text-sm text-muted-foreground truncate">{transfer.fromTeam}</span>
                </div>
                <div className="text-muted-foreground text-sm font-bold px-2">→</div>
                <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                  <span className="text-sm font-semibold text-primary truncate">{transfer.toTeam}</span>
                  <img src={transfer.toTeamLogo} alt={transfer.toTeam} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border">
                <Link href={`/league/${transfer.leagueSlug}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  {transfer.leagueName}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
