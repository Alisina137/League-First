import { useState } from "react";
import { useListStandings, useListLeagues } from "@workspace/api-client-react";

const POPULAR_LEAGUES = [
  { name: "Premier League", slug: "premier-league" },
  { name: "La Liga", slug: "la-liga" },
  { name: "Serie A", slug: "serie-a" },
  { name: "Bundesliga", slug: "bundesliga" },
  { name: "Ligue 1", slug: "ligue-1" },
  { name: "Champions League", slug: "champions-league" },
];

export default function Standings() {
  const [selectedLeague, setSelectedLeague] = useState("premier-league");

  const { data: standings, isLoading } = useListStandings({ leagueSlug: selectedLeague });
  const { data: leagues } = useListLeagues();

  const formColors: Record<string, string> = {
    W: "bg-green-500",
    D: "bg-yellow-500",
    L: "bg-red-500",
  };

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-3xl font-bold tracking-tight">Standings</h1>

      {/* League tabs */}
      <div className="flex flex-wrap gap-2">
        {(leagues ?? POPULAR_LEAGUES).map((league) => (
          <button
            key={league.slug}
            onClick={() => setSelectedLeague(league.slug)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              selectedLeague === league.slug
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {"logoUrl" in league && (
              <img src={(league as any).logoUrl} alt="" className="w-4 h-4 object-contain" />
            )}
            {league.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : !standings || standings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No standings available</p>
          <p className="text-sm">Select a different league.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 w-8">#</th>
                  <th className="text-left px-4 py-3">Club</th>
                  <th className="text-center px-3 py-3 hidden sm:table-cell">P</th>
                  <th className="text-center px-3 py-3 hidden md:table-cell">W</th>
                  <th className="text-center px-3 py-3 hidden md:table-cell">D</th>
                  <th className="text-center px-3 py-3 hidden md:table-cell">L</th>
                  <th className="text-center px-3 py-3 hidden lg:table-cell">GF</th>
                  <th className="text-center px-3 py-3 hidden lg:table-cell">GA</th>
                  <th className="text-center px-3 py-3 hidden sm:table-cell">GD</th>
                  <th className="text-center px-3 py-3 font-bold text-foreground">Pts</th>
                  <th className="text-center px-3 py-3 hidden xl:table-cell">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {standings.map((row, idx) => {
                  const isTop4 = row.position <= 4;
                  const isTop6 = row.position <= 6;
                  const isBottom3 = standings.length - row.position < 3;
                  return (
                    <tr
                      key={row.team.id}
                      className={`transition-colors hover:bg-secondary/50 ${
                        isTop4 ? "border-l-2 border-l-primary" : isTop6 ? "border-l-2 border-l-primary/30" : isBottom3 ? "border-l-2 border-l-destructive/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{row.position}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img src={row.team.logoUrl} alt={row.team.name} className="w-6 h-6 object-contain" />
                          <span className="font-semibold">{row.team.name}</span>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3 text-muted-foreground hidden sm:table-cell">{row.played}</td>
                      <td className="text-center px-3 py-3 text-muted-foreground hidden md:table-cell">{row.won}</td>
                      <td className="text-center px-3 py-3 text-muted-foreground hidden md:table-cell">{row.drawn}</td>
                      <td className="text-center px-3 py-3 text-muted-foreground hidden md:table-cell">{row.lost}</td>
                      <td className="text-center px-3 py-3 text-muted-foreground hidden lg:table-cell">{row.goalsFor}</td>
                      <td className="text-center px-3 py-3 text-muted-foreground hidden lg:table-cell">{row.goalsAgainst}</td>
                      <td className={`text-center px-3 py-3 font-semibold hidden sm:table-cell ${row.goalDifference > 0 ? "text-primary" : row.goalDifference < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </td>
                      <td className="text-center px-3 py-3 font-bold text-foreground">{row.points}</td>
                      <td className="text-center px-3 py-3 hidden xl:table-cell">
                        <div className="flex items-center justify-center gap-0.5">
                          {row.form.split("").slice(-5).map((r, i) => (
                            <span
                              key={i}
                              className={`w-4 h-4 rounded-sm text-xs font-bold text-white flex items-center justify-center ${formColors[r] ?? "bg-muted"}`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
