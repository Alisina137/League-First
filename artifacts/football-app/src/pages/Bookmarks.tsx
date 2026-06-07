import { useGetPreferences, useListLeagues, useListTeams, useListPlayers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Bookmark, Trophy } from "lucide-react";

export default function Bookmarks() {
  const { data: prefs } = useGetPreferences();
  const { data: leagues } = useListLeagues();
  const { data: teams } = useListTeams({});
  const { data: players } = useListPlayers({});

  const favLeagues = leagues?.filter(l => prefs?.favoriteLeagueSlugs?.includes(l.slug)) ?? [];
  const favTeams = teams?.filter(t => prefs?.favoriteTeamIds?.includes(t.id)) ?? [];
  const favPlayers = players?.filter(p => prefs?.favoritePlayerIds?.includes(p.id)) ?? [];

  const isEmpty = favLeagues.length === 0 && favTeams.length === 0 && favPlayers.length === 0;

  return (
    <div className="space-y-8 pb-10">
      <h1 className="text-3xl font-bold tracking-tight">Bookmarks</h1>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center text-muted-foreground">
          <Bookmark className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-semibold mb-2">No bookmarks yet</p>
          <p className="text-sm mb-6">Go to Settings to add your favorite leagues, teams, and players.</p>
          <Link href="/settings" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">
            Open Settings
          </Link>
        </div>
      ) : (
        <>
          {favLeagues.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Favorite Leagues</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {favLeagues.map((league) => (
                  <Link key={league.slug} href={`/league/${league.slug}`} className="group">
                    <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-3 text-center hover:border-primary/50 transition-all">
                      <img src={league.logoUrl} alt={league.name} className="w-12 h-12 object-contain group-hover:scale-110 transition-transform" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                      <p className="font-semibold text-sm group-hover:text-primary transition-colors">{league.name}</p>
                      <p className="text-xs text-muted-foreground">{league.country}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {favTeams.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Favorite Teams</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {favTeams.map((team) => (
                  <Link key={team.id} href={`/league/${team.leagueSlug}`} className="group">
                    <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-3 text-center hover:border-primary/50 transition-all">
                      <img src={team.logoUrl} alt={team.name} className="w-12 h-12 object-contain group-hover:scale-110 transition-transform" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                      <p className="font-semibold text-sm group-hover:text-primary transition-colors">{team.name}</p>
                      <p className="text-xs text-muted-foreground">{team.leagueName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {favPlayers.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Favorite Players</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {favPlayers.map((player) => (
                  <div key={player.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/50 transition-all">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
                      <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.5'; }} />
                    </div>
                    <div>
                      <p className="font-bold">{player.name}</p>
                      <p className="text-xs text-muted-foreground">{player.teamName} • {player.position}</p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{player.goals} goals</span>
                        <span>{player.assists} assists</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
