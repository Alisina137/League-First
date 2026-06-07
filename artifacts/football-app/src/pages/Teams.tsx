import { useState } from "react";
import { useListTeams, useListLeagues } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Teams() {
  const [leagueSlug, setLeagueSlug] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");

  const { data: teams, isLoading } = useListTeams({
    ...(leagueSlug ? { leagueSlug } : {}),
    ...(search ? { search } : {}),
  });
  const { data: leagues } = useListLeagues();

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
      ) : !teams || teams.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No teams found</p>
          <p className="text-sm">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {teams.map((team) => (
            <Link key={team.id} href={`/league/${team.leagueSlug}`} className="group">
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-3 text-center hover:border-primary/50 hover:bg-secondary/30 transition-all">
                <div className="w-14 h-14 flex items-center justify-center">
                  <img
                    src={team.logoUrl}
                    alt={team.name}
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                  />
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{team.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{team.leagueName}</p>
                </div>
                {team.stadium && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{team.stadium}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
