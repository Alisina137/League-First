import { Link } from "wouter";
import { Match } from "@workspace/api-client-react";
import { format } from "date-fns";

interface MatchCardProps {
  match: Match;
  showLeague?: boolean;
}

export function MatchCard({ match, showLeague = false }: MatchCardProps) {
  const isLive = match.status === "live";

  return (
    <Link href={`/league/${match.leagueSlug}`} className="block">
      <div className="bg-card hover:bg-secondary/50 border border-border rounded-lg p-4 transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer group">
        {showLeague && (
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
            {match.leagueLogo && <img src={match.leagueLogo} alt={match.leagueName} className="w-4 h-4 object-contain" />}
            <span className="font-semibold uppercase tracking-wider">{match.leagueName}</span>
          </div>
        )}
        <div className="flex justify-between items-center mb-2">
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={match.homeTeam.logoUrl} alt={match.homeTeam.name} className="w-6 h-6 object-contain" />
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{match.homeTeam.name}</span>
              </div>
              <span className={`text-lg font-bold ${isLive ? 'text-primary' : 'text-foreground'}`}>
                {match.homeScore !== null ? match.homeScore : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={match.awayTeam.logoUrl} alt={match.awayTeam.name} className="w-6 h-6 object-contain" />
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{match.awayTeam.name}</span>
              </div>
              <span className={`text-lg font-bold ${isLive ? 'text-primary' : 'text-foreground'}`}>
                {match.awayScore !== null ? match.awayScore : "-"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-border">
          {isLive ? (
            <div className="flex items-center gap-1.5 text-primary font-bold animate-pulse">
              <div className="w-2 h-2 rounded-full bg-primary" />
              {match.minute}'
            </div>
          ) : (
            <div className="text-muted-foreground">
              {match.status === "finished" ? "FT" : format(new Date(match.matchDate), "MMM d, HH:mm")}
            </div>
          )}
          {match.venue && (
            <div className="text-muted-foreground truncate max-w-[120px] text-right" title={match.venue}>
              {match.venue}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
