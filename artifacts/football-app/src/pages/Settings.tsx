import { useState, useEffect } from "react";
import { useGetPreferences, useUpdatePreferences, useListLeagues, useListTeams, useListPlayers } from "@workspace/api-client-react";
import { Check } from "lucide-react";

export default function Settings() {
  const { data: prefs } = useGetPreferences();
  const updatePrefs = useUpdatePreferences();
  const { data: leagues } = useListLeagues();
  const { data: teams } = useListTeams({});
  const { data: players } = useListPlayers({});

  const [favLeagues, setFavLeagues] = useState<string[]>([]);
  const [favTeams, setFavTeams] = useState<number[]>([]);
  const [favPlayers, setFavPlayers] = useState<number[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (prefs) {
      setFavLeagues(prefs.favoriteLeagueSlugs ?? []);
      setFavTeams(prefs.favoriteTeamIds ?? []);
      setFavPlayers(prefs.favoritePlayerIds ?? []);
    }
  }, [prefs]);

  const toggleLeague = (slug: string) => {
    setFavLeagues(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
  };
  const toggleTeam = (id: number) => {
    setFavTeams(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };
  const togglePlayer = (id: number) => {
    setFavPlayers(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSave = () => {
    updatePrefs.mutate(
      { data: { favoriteLeagueSlugs: favLeagues, favoriteTeamIds: favTeams, favoritePlayerIds: favPlayers } },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  return (
    <div className="space-y-8 pb-10 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <button
          onClick={handleSave}
          disabled={updatePrefs.isPending}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saved ? <Check className="w-4 h-4" /> : null}
          {saved ? "Saved" : updatePrefs.isPending ? "Saving..." : "Save Preferences"}
        </button>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-1">Favorite Leagues</h2>
        <p className="text-sm text-muted-foreground mb-4">Select leagues to prioritize in your feed and bookmarks.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {leagues?.map((league) => {
            const selected = favLeagues.includes(league.slug);
            return (
              <button
                key={league.slug}
                onClick={() => toggleLeague(league.slug)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                  selected ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary/50"
                }`}
              >
                <img src={league.logoUrl} alt={league.name} className="w-7 h-7 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{league.name}</p>
                  <p className="text-xs text-muted-foreground">{league.country}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                  {selected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-1">Favorite Teams</h2>
        <p className="text-sm text-muted-foreground mb-4">Select up to 5 teams to follow closely.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {teams?.slice(0, 20).map((team) => {
            const selected = favTeams.includes(team.id);
            return (
              <button
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${
                  selected ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary/50"
                }`}
              >
                <img src={team.logoUrl} alt={team.name} className="w-6 h-6 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                <span className="font-semibold text-xs truncate">{team.name}</span>
                {selected && <Check className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-1">Favorite Players</h2>
        <p className="text-sm text-muted-foreground mb-4">Pick players to track in your bookmarks.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {players?.slice(0, 20).map((player) => {
            const selected = favPlayers.includes(player.id);
            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                  selected ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary/50"
                }`}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
                  <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.5'; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{player.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{player.teamName} • {player.position}</p>
                </div>
                {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
