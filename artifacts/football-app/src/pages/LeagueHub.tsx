import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  apiFetch,
  COMPETITIONS,
  type LiveStanding,
  type LiveMatch,
  type LiveScorer,
  type LiveTeam,
  type KnockoutData,
} from "../lib/liveApi";
import { TableSkeleton, ErrorState, EmptyState } from "../components/Skeleton";
import { UpcomingEmptyState } from "../components/UpcomingEmptyState";
import { Trophy, Calendar, Users, TrendingUp, Shield, Zap } from "lucide-react";

interface LeagueHubData {
  competition: { slug: string; code: string; name: string; country: string; emblem: string };
  standings: LiveStanding[];
  liveMatches: LiveMatch[];
  upcomingMatches: LiveMatch[];
  recentMatches: LiveMatch[];
  scorers: LiveScorer[];
  nextFixtureDate: string | null;
  hasStarted: boolean;
}

type Tab = "overview" | "groups" | "knockout" | "matches" | "teams";

const TOURNAMENT_SLUGS = new Set(["champions-league", "europa-league", "world-cup"]);
const UNSUPPORTED_SLUGS = new Set(["saudi-pro-league", "mls", "europa-league"]);

const TAB_CONFIG: { id: Tab; label: string }[] = [
  { id: "overview",  label: "Overview"    },
  { id: "groups",    label: "Group Stage" },
  { id: "knockout",  label: "Knockout"    },
  { id: "matches",   label: "Matches"     },
  { id: "teams",     label: "Teams"       },
];

const formColors: Record<string, string> = {
  W: "bg-green-500",
  D: "bg-yellow-500",
  L: "bg-red-500",
};

function MatchRow({ match }: { match: LiveMatch }) {
  const isLive = match.status === "live";
  const date = new Date(match.matchDate);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${isLive ? "bg-primary/5" : ""}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <img src={match.homeTeam.crest} alt={match.homeTeam.shortName} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
        <span className="text-sm font-semibold truncate">{match.homeTeam.shortName}</span>
      </div>
      <div className="text-center px-3 flex-shrink-0">
        {isLive ? (
          <span className="text-xs font-bold text-primary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {match.minute ? `${match.minute}'` : "LIVE"}
          </span>
        ) : hasScore ? (
          <span className="text-sm font-bold tabular-nums">{match.homeScore} – {match.awayScore}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{dateStr}<br />{timeStr}</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className="text-sm font-semibold truncate text-right">{match.awayTeam.shortName}</span>
        <img src={match.awayTeam.crest} alt={match.awayTeam.shortName} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
      </div>
    </div>
  );
}

// ─── TOURNAMENT BRACKET ──────────────────────────────────────────
const B_CARD_W = 188;
const B_CARD_H = 80;
const B_SLOT = 100;   // vertical slot height at the earliest (most-match) round
const B_CONN = 30;    // width of connector SVG between columns

function bracketWinner(match: LiveMatch): "home" | "away" | null {
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return "home";
  if (match.awayScore > match.homeScore) return "away";
  return null;
}

function BracketTeamRow({ team, score, winning }: {
  team: { name: string; shortName: string; crest: string };
  score: number | null;
  winning: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 px-1.5 py-[5px] rounded-sm transition-colors ${winning ? "bg-emerald-500/10 dark:bg-emerald-500/15" : ""}`}>
      <img
        src={team.crest} alt={team.shortName}
        className="w-4 h-4 object-contain flex-shrink-0"
        onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
      />
      <span className={`flex-1 text-[11px] truncate ${winning ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>
        {team.shortName || team.name}
      </span>
      <span className={`text-xs tabular-nums w-4 text-right font-bold ${winning ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
        {score !== null ? score : ""}
      </span>
    </div>
  );
}

function BracketCard({ match, isFinal = false }: { match: LiveMatch; isFinal?: boolean }) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const w = bracketWinner(match);
  const date = new Date(match.matchDate);
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const cardW = isFinal ? 212 : B_CARD_W;

  return (
    <div style={{ width: cardW }} className={`rounded-lg border overflow-hidden shadow-sm transition-all duration-150
      ${isLive ? "border-primary/60 shadow-primary/10 shadow-md" : isFinal && isFinished && w ? "border-yellow-400/60 shadow-yellow-500/10 shadow-md" : "border-border hover:border-primary/40"}`}>
      {isLive ? (
        <div className="bg-primary flex items-center justify-center gap-1 py-[3px]">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-bold text-white tracking-wide">LIVE{match.minute ? ` ${match.minute}'` : ""}</span>
        </div>
      ) : isFinal && isFinished && w ? (
        <div className="bg-yellow-400/15 border-b border-yellow-400/30 flex items-center justify-center gap-1 py-[3px]">
          <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400">🏆 CHAMPION</span>
        </div>
      ) : !isFinished ? (
        <div className="bg-muted/50 border-b border-border/40 flex items-center justify-center py-[3px]">
          <span className="text-[10px] text-muted-foreground">{dateStr} · {timeStr}</span>
        </div>
      ) : null}
      <div className="bg-card p-1">
        <BracketTeamRow team={match.homeTeam} score={match.homeScore} winning={w === "home"} />
        <div className="mx-1.5 h-px bg-border/60" />
        <BracketTeamRow team={match.awayTeam} score={match.awayScore} winning={w === "away"} />
      </div>
      {isFinal && match.venue && isFinished && (
        <div className="bg-card pb-1.5 px-2 text-center border-t border-border/30">
          <span className="text-[10px] text-muted-foreground">{match.venue}</span>
        </div>
      )}
    </div>
  );
}

function BracketConnector({ numParents, childSlot, totalH, side }: {
  numParents: number; childSlot: number; totalH: number; side: "left" | "right";
}) {
  const mid = B_CONN / 2;
  const segs: string[] = [];
  for (let q = 0; q < numParents; q++) {
    const pCY  = (q + 0.5) * childSlot * 2;
    const c1CY = (2 * q + 0.5) * childSlot;
    const c2CY = (2 * q + 1.5) * childSlot;
    if (side === "left") {
      segs.push(`M0,${c1CY}H${mid}`, `M0,${c2CY}H${mid}`, `M${mid},${c1CY}V${c2CY}`, `M${mid},${pCY}H${B_CONN}`);
    } else {
      segs.push(`M${B_CONN},${c1CY}H${mid}`, `M${B_CONN},${c2CY}H${mid}`, `M${mid},${c1CY}V${c2CY}`, `M${mid},${pCY}H0`);
    }
  }
  return (
    <svg width={B_CONN} height={totalH} className="flex-shrink-0">
      {segs.map((d, i) => (
        <path key={i} d={d} stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function FinalConnector({ totalH, side }: { totalH: number; side: "left" | "right" }) {
  const cy = totalH / 2;
  return (
    <svg width={B_CONN} height={totalH} className="flex-shrink-0">
      <line x1={side === "left" ? 0 : B_CONN} y1={cy} x2={side === "left" ? B_CONN : 0} y2={cy}
        stroke="hsl(var(--border))" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function KnockoutView({ slug }: { slug: string }) {
  const { data, isLoading, isError, refetch } = useQuery<KnockoutData>({
    queryKey: ["live-knockout", slug],
    queryFn: () => apiFetch(`/api/live/knockout?leagueSlug=${slug}`),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 2,
  });

  if (isLoading) return <TableSkeleton rows={8} cols={4} />;
  if (isError) return <ErrorState message="Knockout data unavailable" onRetry={() => refetch()} />;

  if (!data || data.rounds.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center space-y-3">
        <div className="text-4xl">🏆</div>
        <h3 className="font-bold text-lg">No Knockout Stage Data</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Knockout fixtures will appear here once the group stage is complete and the draw has been made.
        </p>
      </div>
    );
  }

  const rounds          = data.rounds;
  const finalRound      = rounds[rounds.length - 1];
  // Third-place is a side match — separate it from the main bracket tree
  const thirdPlaceRound = rounds.slice(0, -1).find(r => r.stage === "THIRD_PLACE");
  const preRounds       = rounds.slice(0, -1).filter(r => r.stage !== "THIRD_PLACE");
  const numLevels       = preRounds.length;

  // Split each pre-final round into left / right halves
  const leftByLevel  = preRounds.map(r => r.matches.slice(0, Math.ceil(r.matches.length / 2)));
  const rightByLevel = preRounds.map(r => r.matches.slice(Math.ceil(r.matches.length / 2)));

  // Total bracket height is driven by the earliest (most-match) round
  const maxSide = Math.max(leftByLevel[0]?.length ?? 0, rightByLevel[0]?.length ?? 0, 1);
  const totalH  = maxSide * B_SLOT;

  // Slot height grows by ×2 each level closer to Final
  const getSlot = (li: number) => B_SLOT * Math.pow(2, li);
  // Vertical position (top) of a match card within its column
  const getTop  = (mi: number, li: number) => { const s = getSlot(li); return mi * s + (s - B_CARD_H) / 2; };

  const RoundLabel = ({ label, gold }: { label: string; gold?: boolean }) => (
    <div className="h-7 flex items-end justify-center pb-1">
      <span className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${gold ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="space-y-3">
      {data.isLive && (
        <div className="flex items-center gap-2 text-primary text-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Live knockout matches in progress
        </div>
      )}

      <div className="overflow-x-auto pb-3 -mx-1 px-1">
        <div className="flex items-start" style={{ minWidth: "max-content" }}>

          {/* ── LEFT SIDE (R16 → QF → SF) ── */}
          {leftByLevel.map((matches, li) => {
            const slot   = getSlot(li);
            const isLast = li === numLevels - 1;
            return (
              <div key={`L${li}`} className="flex items-start flex-shrink-0">
                <div className="flex flex-col flex-shrink-0" style={{ width: B_CARD_W }}>
                  <RoundLabel label={preRounds[li].label} />
                  <div className="relative" style={{ height: totalH }}>
                    {matches.map((m, mi) => (
                      <div key={m.id} className="absolute" style={{ top: getTop(mi, li), width: B_CARD_W }}>
                        <BracketCard match={m} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col flex-shrink-0" style={{ width: B_CONN }}>
                  <div className="h-7" />
                  {isLast
                    ? <FinalConnector totalH={totalH} side="left" />
                    : <BracketConnector numParents={leftByLevel[li + 1]?.length ?? 0} childSlot={slot} totalH={totalH} side="left" />
                  }
                </div>
              </div>
            );
          })}

          {/* ── FINAL (center) ── */}
          <div className="flex flex-col flex-shrink-0 items-center" style={{ width: 212 }}>
            <RoundLabel label="🏆 Final" gold />
            <div className="flex items-center justify-center" style={{ height: totalH }}>
              {finalRound.matches[0]
                ? <BracketCard match={finalRound.matches[0]} isFinal />
                : (
                  <div className="rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center"
                    style={{ width: 212, height: B_CARD_H }}>
                    <span className="text-xs text-muted-foreground">TBD</span>
                  </div>
                )
              }
            </div>
          </div>

          {/* ── RIGHT SIDE (SF → QF → R16) ── */}
          {Array.from({ length: numLevels }, (_, revIdx) => {
            const li      = numLevels - 1 - revIdx;
            const matches = rightByLevel[li];
            const slot    = getSlot(li);
            const isFirst = revIdx === 0;
            return (
              <div key={`R${li}`} className="flex items-start flex-shrink-0">
                <div className="flex flex-col flex-shrink-0" style={{ width: B_CONN }}>
                  <div className="h-7" />
                  {isFirst
                    ? <FinalConnector totalH={totalH} side="right" />
                    : <BracketConnector
                        numParents={rightByLevel[numLevels - revIdx]?.length ?? 0}
                        childSlot={slot}
                        totalH={totalH}
                        side="right"
                      />
                  }
                </div>
                <div className="flex flex-col flex-shrink-0" style={{ width: B_CARD_W }}>
                  <RoundLabel label={preRounds[li].label} />
                  <div className="relative" style={{ height: totalH }}>
                    {matches.map((m, mi) => (
                      <div key={m.id} className="absolute" style={{ top: getTop(mi, li), width: B_CARD_W }}>
                        <BracketCard match={m} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* ── THIRD PLACE (if present) ── */}
      {thirdPlaceRound && thirdPlaceRound.matches[0] && (
        <div className="flex items-center gap-3 pt-1">
          <div className="flex flex-col items-start gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {thirdPlaceRound.label}
            </span>
            <BracketCard match={thirdPlaceRound.matches[0]} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/50 inline-block" />
          Winner / advancing
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
          Live match
        </span>
      </div>
    </div>
  );
}

function GroupStageView({ standings, slug }: { standings: LiveStanding[]; slug: string }) {
  const isGrouped = standings.some(r => r.group != null);
  if (standings.length === 0) return <EmptyState message="No group stage standings available" />;

  if (!isGrouped) {
    return (
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
                <th className="text-center px-3 py-3 hidden sm:table-cell">GD</th>
                <th className="text-center px-3 py-3 font-bold text-foreground">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {standings.map((row) => (
                <tr key={row.team.id} className={`hover:bg-secondary/50 transition-colors ${row.position <= 8 ? "border-l-2 border-l-primary" : ""}`}>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{row.position}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <img src={row.team.crest} alt={row.team.name} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                      <span className="font-semibold text-sm truncate max-w-[160px]">{row.team.name}</span>
                    </div>
                  </td>
                  <td className="text-center px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{row.played}</td>
                  <td className="text-center px-3 py-2.5 text-muted-foreground hidden md:table-cell">{row.won}</td>
                  <td className="text-center px-3 py-2.5 text-muted-foreground hidden md:table-cell">{row.drawn}</td>
                  <td className="text-center px-3 py-2.5 text-muted-foreground hidden md:table-cell">{row.lost}</td>
                  <td className={`text-center px-3 py-2.5 font-semibold hidden sm:table-cell ${row.goalDifference > 0 ? "text-primary" : row.goalDifference < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="text-center px-3 py-2.5 font-bold">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary rounded-full inline-block" /> Advance to knockout stage</span>
        </div>
      </div>
    );
  }

  const groupMap = new Map<string, LiveStanding[]>();
  for (const row of standings) {
    const key = row.group ?? "Group";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(row);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from(groupMap.entries()).map(([groupName, rows]) => (
        <div key={groupName} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border bg-secondary/30">
            <span className="text-xs font-bold uppercase tracking-wider">{groupName}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs border-b border-border">
                <th className="text-left px-3 py-1.5 w-6">#</th>
                <th className="text-left px-3 py-1.5">Club</th>
                <th className="text-center px-2 py-1.5">P</th>
                <th className="text-center px-2 py-1.5">GD</th>
                <th className="text-center px-2 py-1.5 font-bold text-foreground">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, idx) => (
                <tr key={row.team.id} className={`hover:bg-secondary/40 ${idx < 2 ? "border-l-2 border-l-primary" : ""}`}>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{row.position}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <img src={row.team.crest} alt={row.team.name} className="w-4 h-4 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                      <span className="font-medium text-xs truncate max-w-[80px]">{row.team.shortName}</span>
                    </div>
                  </td>
                  <td className="text-center px-2 py-2 text-muted-foreground text-xs">{row.played}</td>
                  <td className={`text-center px-2 py-2 text-xs font-semibold ${row.goalDifference > 0 ? "text-primary" : row.goalDifference < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="text-center px-2 py-2 font-bold text-xs">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function AllMatchesView({ liveMatches, upcomingMatches, recentMatches }: { liveMatches: LiveMatch[]; upcomingMatches: LiveMatch[]; recentMatches: LiveMatch[] }) {
  return (
    <div className="space-y-6">
      {liveMatches.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" /> Live Now
          </h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {liveMatches.map(m => <MatchRow key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {upcomingMatches.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />Upcoming</h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {upcomingMatches.map(m => <MatchRow key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {recentMatches.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Results</h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {recentMatches.map(m => <MatchRow key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {liveMatches.length === 0 && upcomingMatches.length === 0 && recentMatches.length === 0 && (
        <EmptyState message="No matches available for this competition" />
      )}
    </div>
  );
}

function TeamsView({ slug }: { slug: string }) {
  const { data, isLoading, isError, refetch } = useQuery<LiveTeam[]>({
    queryKey: ["live-teams", slug],
    queryFn: () => apiFetch(`/api/live/teams?leagueSlug=${slug}`),
    staleTime: 60 * 60_000,
    retry: 2,
  });

  if (isLoading) return <TableSkeleton rows={12} cols={3} />;
  if (isError) return <ErrorState message="Teams data unavailable" onRetry={() => refetch()} />;
  if (!data || data.length === 0) return <EmptyState message="No teams data for this competition" />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {data.map(team => (
        <div key={team.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
          <img src={team.crest} alt={team.name} className="w-10 h-10 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{team.name}</p>
            <p className="text-xs text-muted-foreground">
              {team.founded ? `Est. ${team.founded}` : ""}
              {team.founded && team.venue ? " · " : ""}
              {team.venue ? team.venue : ""}
            </p>
            {team.coach && (
              <p className="text-xs text-muted-foreground truncate">{team.coach}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeagueHub() {
  const { slug } = useParams<{ slug: string }>();
  const safeSlug = slug ?? "";
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const competition = COMPETITIONS.find(c => c.slug === safeSlug);
  const isTournament = TOURNAMENT_SLUGS.has(safeSlug);
  const isUnsupported = UNSUPPORTED_SLUGS.has(safeSlug);

  const { data, isLoading, isError, error, refetch } = useQuery<LeagueHubData>({
    queryKey: ["live-league-hub", safeSlug],
    queryFn: () => apiFetch(`/api/live/league-hub?leagueSlug=${safeSlug}`),
    enabled: !!safeSlug && !isUnsupported,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 2,
  });

  const leagueName = competition?.name ?? data?.competition.name ?? safeSlug;
  const emblem = competition?.emblem ?? data?.competition.emblem ?? "";

  if (isUnsupported) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-4">
          {emblem && <img src={emblem} alt={leagueName} className="w-16 h-16 object-contain" />}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{leagueName}</h1>
            <p className="text-muted-foreground mt-1">{competition?.country}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
          <div className="text-4xl">⚽</div>
          <h2 className="text-xl font-bold">Live data not available</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            {leagueName === "UEFA Europa League"
              ? "UEFA Europa League data requires a paid football-data.org plan. Live data is available for the top 5 European leagues, UEFA Champions League, and FIFA World Cup."
              : `${leagueName} is not covered by the current data plan. Live standings, matches and scorers are available for the top 5 European leagues, Champions League, and FIFA World Cup.`}
          </p>
          <Link href="/standings" className="inline-block mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            View Supported Leagues
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-4">
          {emblem && <img src={emblem} alt={leagueName} className="w-16 h-16 object-contain" data-no-transition />}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{leagueName}</h1>
            <div className="h-4 w-32 bg-secondary rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2"><TableSkeleton rows={12} cols={5} /></div>
          <div><TableSkeleton rows={8} cols={3} /></div>
        </div>
      </div>
    );
  }

  if (isError) {
    const msg = (error as Error).message ?? "";
    const isNotSupported = msg.includes("not_supported") || msg.includes("404");
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-4">
          {emblem && <img src={emblem} alt={leagueName} className="w-16 h-16 object-contain" />}
          <h1 className="text-3xl font-bold tracking-tight">{leagueName}</h1>
        </div>
        {isNotSupported ? (
          <EmptyState message="This competition is not available on the current data plan." />
        ) : (
          <ErrorState message="Unable to load live league data from football-data.org." onRetry={() => refetch()} />
        )}
      </div>
    );
  }

  if (!data) return <EmptyState message="No data returned for this league." />;

  const { standings, liveMatches, upcomingMatches, recentMatches, scorers } = data;
  const nextMatches = [...liveMatches, ...upcomingMatches].slice(0, 6);
  const isGrouped = standings.some(r => r.group != null);

  return (
    <div className="space-y-6 pb-10">
      {/* Hero */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center p-3 shadow-md flex-shrink-0">
          <img src={data.competition.emblem} alt={data.competition.name} className="w-full h-full object-contain" data-no-transition onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
        </div>
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-0.5">{data.competition.country}</p>
          <h1 className="text-3xl md:text-4xl font-black">{data.competition.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {standings.length > 0 ? `${standings.length} teams` : ""}
            {liveMatches.length > 0 && <span className="text-primary font-semibold"> · {liveMatches.length} live now</span>}
            {isTournament && <span className="ml-1 text-xs font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Tournament</span>}
          </p>
        </div>
      </div>

      {/* Tab navigation — tournaments only */}
      {isTournament && (
        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── KNOCKOUT TAB ─── */}
      {isTournament && activeTab === "knockout" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-primary" />Knockout Stage</h2>
          </div>
          <KnockoutView slug={safeSlug} />
        </div>
      )}

      {/* ─── GROUP STAGE TAB ─── */}
      {isTournament && activeTab === "groups" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" />Group Stage</h2>
          <GroupStageView standings={standings} slug={safeSlug} />
        </div>
      )}

      {/* ─── ALL MATCHES TAB ─── */}
      {isTournament && activeTab === "matches" && (
        <AllMatchesView liveMatches={liveMatches} upcomingMatches={upcomingMatches} recentMatches={recentMatches} />
      )}

      {/* ─── TEAMS TAB ─── */}
      {isTournament && activeTab === "teams" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Teams</h2>
          <TeamsView slug={safeSlug} />
        </div>
      )}

      {/* ─── OVERVIEW TAB (default, also used for non-tournaments) ─── */}
      {(!isTournament || activeTab === "overview") && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left — standings + scorers */}
          <div className="xl:col-span-2 space-y-6">

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" />Standings</h2>
                <Link href={`/standings/${safeSlug}`} className="text-sm text-primary hover:underline font-medium">Full Table</Link>
              </div>

              {standings.length === 0 ? (
                <EmptyState message="Standings not available for this competition" />
              ) : isGrouped ? (
                (() => {
                  const groupMap = new Map<string, LiveStanding[]>();
                  for (const row of standings) {
                    const key = row.group ?? "Group";
                    if (!groupMap.has(key)) groupMap.set(key, []);
                    groupMap.get(key)!.push(row);
                  }
                  const groupEntries = Array.from(groupMap.entries());
                  const preview = groupEntries.slice(0, 4);
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {preview.map(([groupName, rows]) => (
                          <div key={groupName} className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="px-3 py-2 border-b border-border bg-secondary/30">
                              <span className="text-xs font-bold uppercase tracking-wider">{groupName}</span>
                            </div>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-muted-foreground text-xs border-b border-border">
                                  <th className="text-left px-3 py-1.5 w-6">#</th>
                                  <th className="text-left px-3 py-1.5">Club</th>
                                  <th className="text-center px-2 py-1.5">P</th>
                                  <th className="text-center px-2 py-1.5">GD</th>
                                  <th className="text-center px-2 py-1.5 font-bold text-foreground">Pts</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {rows.map((row, idx) => (
                                  <tr key={row.team.id} className={`hover:bg-secondary/40 ${idx < 2 ? "border-l-2 border-l-primary" : ""}`}>
                                    <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{row.position}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1.5">
                                        <img src={row.team.crest} alt={row.team.name} className="w-4 h-4 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                                        <span className="font-medium text-xs truncate max-w-[90px]">{row.team.shortName}</span>
                                      </div>
                                    </td>
                                    <td className="text-center px-2 py-2 text-muted-foreground text-xs">{row.played}</td>
                                    <td className={`text-center px-2 py-2 text-xs font-semibold ${row.goalDifference > 0 ? "text-primary" : row.goalDifference < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                                    </td>
                                    <td className="text-center px-2 py-2 font-bold text-xs">{row.points}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                      {groupEntries.length > 4 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing {preview.length} of {groupEntries.length} groups —{" "}
                          <button onClick={() => setActiveTab("groups")} className="text-primary hover:underline font-semibold">see all groups</button>
                        </p>
                      )}
                    </div>
                  );
                })()
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
                          <th className="text-center px-3 py-3 hidden sm:table-cell">GD</th>
                          <th className="text-center px-3 py-3 font-bold text-foreground">Pts</th>
                          <th className="text-center px-3 py-3 hidden xl:table-cell">Form</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {standings.map((row) => {
                          const isTop4 = row.position <= 4;
                          const isBottom3 = standings.length - row.position < 3;
                          return (
                            <tr key={row.team.id} className={`transition-colors hover:bg-secondary/50 ${isTop4 ? "border-l-2 border-l-primary" : isBottom3 ? "border-l-2 border-l-destructive/50" : ""}`}>
                              <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{row.position}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <img src={row.team.crest} alt={row.team.name} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                                  <span className="font-semibold text-sm truncate max-w-[140px]" title={row.team.name}>{row.team.name}</span>
                                </div>
                              </td>
                              <td className="text-center px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{row.played}</td>
                              <td className="text-center px-3 py-2.5 text-muted-foreground hidden md:table-cell">{row.won}</td>
                              <td className="text-center px-3 py-2.5 text-muted-foreground hidden md:table-cell">{row.drawn}</td>
                              <td className="text-center px-3 py-2.5 text-muted-foreground hidden md:table-cell">{row.lost}</td>
                              <td className={`text-center px-3 py-2.5 font-semibold hidden sm:table-cell ${row.goalDifference > 0 ? "text-primary" : row.goalDifference < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                              </td>
                              <td className="text-center px-3 py-2.5 font-bold">{row.points}</td>
                              <td className="text-center px-3 py-2.5 hidden xl:table-cell">
                                {row.form ? (
                                  <div className="flex items-center justify-center gap-0.5">
                                    {row.form.split(",").filter(Boolean).slice(-5).map((r, i) => (
                                      <span key={i} className={`w-4 h-4 rounded-sm text-[10px] font-bold text-white flex items-center justify-center ${formColors[r.trim()] ?? "bg-muted"}`}>
                                        {r.trim().charAt(0)}
                                      </span>
                                    ))}
                                  </div>
                                ) : <span className="text-muted-foreground text-xs">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex gap-4">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary rounded-full inline-block" /> Champions League</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-destructive/50 rounded-full inline-block" /> Relegation</span>
                  </div>
                </div>
              )}
            </section>

            {scorers.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Top Scorers</h2>
                  <Link href="/players" className="text-sm text-primary hover:underline font-medium">All Scorers</Link>
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {scorers.slice(0, 8).map((s, i) => (
                    <div key={s.player.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <span className="w-6 text-center text-xs font-mono text-muted-foreground flex-shrink-0">{i + 1}</span>
                      <img src={s.team.crest} alt={s.team.shortName} className="w-6 h-6 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{s.player.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.team.name}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm flex-shrink-0">
                        <span className="font-bold text-primary text-base w-6 text-right">{s.goals}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">goals</span>
                        {s.assists !== null && <span className="text-xs text-muted-foreground hidden md:inline">{s.assists} ast</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right — live/upcoming + results */}
          <div className="space-y-6">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {liveMatches.length > 0
                    ? <><span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" /> Live & Upcoming</>
                    : "Upcoming"}
                </h2>
                {isTournament ? (
                  <button onClick={() => setActiveTab("matches")} className="text-sm text-primary hover:underline font-medium">All</button>
                ) : (
                  <Link href="/matches" className="text-sm text-primary hover:underline font-medium">All</Link>
                )}
              </div>
              {nextMatches.length > 0 ? (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {nextMatches.map(m => <MatchRow key={m.id} match={m} />)}
                </div>
              ) : (
                <UpcomingEmptyState
                  context="competition"
                  nextFixtureDate={data.nextFixtureDate ?? null}
                  hasStarted={data.hasStarted ?? false}
                  isTournament={isTournament}
                  competitionName={data.competition.name}
                  competitionEmblem={data.competition.emblem}
                />
              )}
            </section>

            {recentMatches.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Results</h2>
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {recentMatches.slice(0, 8).map(m => <MatchRow key={m.id} match={m} />)}
                </div>
              </section>
            )}

            {isTournament && (
              <section>
                <button
                  onClick={() => setActiveTab("knockout")}
                  className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Knockout Stage</p>
                    <p className="text-xs text-muted-foreground">View bracket & results →</p>
                  </div>
                </button>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
