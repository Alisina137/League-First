import { useState } from "react";
import { useListPlayers, useListLeagues } from "@workspace/api-client-react";
import { Link } from "wouter";

type StatFilter = "goals" | "assists" | "cleanSheets";

export default function Players() {
  const [leagueSlug, setLeagueSlug] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [stat, setStat] = useState<StatFilter>("goals");

  const { data: players, isLoading } = useListPlayers({
    ...(leagueSlug ? { leagueSlug } : {}),
    ...(search ? { search } : {}),
    stat,
  });
  const { data: leagues } = useListLeagues();

  const statOptions: { value: StatFilter; label: string }[] = [
    { value: "goals", label: "Top Scorers" },
    { value: "assists", label: "Top Assists" },
    { value: "cleanSheets", label: "Clean Sheets" },
  ];

  const positionColors: Record<string, string> = {
    FW: "bg-red-500/20 text-red-400",
    MF: "bg-blue-500/20 text-blue-400",
    DF: "bg-yellow-500/20 text-yellow-400",
    GK: "bg-green-500/20 text-green-400",
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Players</h1>
        <input
          type="search"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-full sm:w-64"
        />
      </div>

      {/* Stat filter */}
      <div className="flex flex-wrap gap-2">
        {statOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStat(opt.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              stat === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
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
      ) : !players || players.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No players found</p>
          <p className="text-sm">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 w-8">#</th>
                  <th className="text-left px-4 py-3">Player</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Club</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">League</th>
                  <th className="text-center px-4 py-3">
                    {stat === "goals" ? "Goals" : stat === "assists" ? "Assists" : "CS"}
                  </th>
                  <th className="text-center px-4 py-3 hidden lg:table-cell">Apps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {players.slice(0, 30).map((player, idx) => (
                  <tr key={player.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
                          <img
                            src={player.photoUrl}
                            alt={player.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.5'; }}
                          />
                        </div>
                        <div>
                          <div className="font-semibold">{player.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${positionColors[player.position] ?? "bg-muted text-muted-foreground"}`}>
                              {player.position}
                            </span>
                            <span className="text-xs text-muted-foreground">{player.nationality}</span>
                            {player.injured && <span className="text-xs text-destructive font-semibold">Injured</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <img src={player.teamLogo} alt={player.teamName} className="w-4 h-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <span className="text-muted-foreground">{player.teamName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Link href={`/league/${player.leagueSlug}`} className="text-muted-foreground hover:text-primary transition-colors text-xs">
                        {player.leagueName}
                      </Link>
                    </td>
                    <td className="text-center px-4 py-3 font-bold text-primary text-lg">
                      {stat === "goals" ? player.goals : stat === "assists" ? player.assists : player.cleanSheets}
                    </td>
                    <td className="text-center px-4 py-3 text-muted-foreground hidden lg:table-cell">{player.appearances}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
