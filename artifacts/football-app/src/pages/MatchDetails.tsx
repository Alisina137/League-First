import { useState, useEffect } from "react";
import { useParams, useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Share2, MapPin, ArrowLeft } from "lucide-react";
import { apiFetch, type MatchDetailsData, type LiveMatch, type LiveStanding, type TeamLineup } from "../lib/liveApi";
import { Skeleton, ErrorState } from "../components/Skeleton";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  REGULAR_SEASON: "Regular Season",
  GROUP_STAGE: "Group Stage",
  LEAGUE_STAGE: "League Stage",
  LEAGUE_PHASE: "League Phase",
  PLAYOFFS: "Playoffs",
  KNOCKOUT_ROUND_PLAY_OFFS: "Knockout Playoffs",
  LAST_32: "Round of 32",
  ROUND_OF_32: "Round of 32",
  LAST_16: "Round of 16",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINALS: "Quarter Finals",
  SEMI_FINALS: "Semi Finals",
  THIRD_PLACE: "Third Place",
  FINAL: "Final",
};

function formatStage(s?: string | null) {
  if (!s) return "";
  return (
    STAGE_LABELS[s] ??
    s.split("_").map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ")
  );
}

interface Countdown { h: number; m: number; s: number; total: number }

function useCountdown(target: string): Countdown {
  const calc = () => {
    const ms = new Date(target).getTime() - Date.now();
    const total = Math.max(0, ms);
    const h = Math.floor(total / 3_600_000);
    const m = Math.floor((total % 3_600_000) / 60_000);
    const s = Math.floor((total % 60_000) / 1_000);
    return { h, m, s, total };
  };
  const [cd, setCd] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setCd(calc()), 1_000);
    return () => clearInterval(t);
  }, [target]);
  return cd;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-secondary border border-border rounded-lg px-3 py-2 min-w-[52px] text-center">
        <span className="text-2xl md:text-3xl font-black tabular-nums leading-none">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}

function FormBadge({ char }: { char: string }) {
  const cls =
    char === "W" ? "bg-emerald-500 text-white" :
    char === "L" ? "bg-red-500 text-white" :
    "bg-amber-400 text-black";
  return (
    <span className={`${cls} text-[11px] font-bold w-6 h-6 rounded-sm inline-flex items-center justify-center`}>
      {char}
    </span>
  );
}

// ─── Match header ─────────────────────────────────────────────────────────────

function MatchHeader({ data }: { data: MatchDetailsData }) {
  const { match } = data;
  const cd = useCountdown(match.matchDate);
  const date = new Date(match.matchDate);
  const dateStr = date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const isUpcoming = match.status === "upcoming";

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Competition bar */}
      <div className="bg-secondary/40 px-6 py-3 text-center border-b border-border">
        <div className="flex items-center justify-center gap-2 mb-0.5">
          <img
            src={match.competition.emblem}
            alt=""
            className="w-5 h-5 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span className="font-bold text-sm">{match.competition.name}</span>
        </div>
        {(match.stage || match.matchday) && (
          <p className="text-xs text-muted-foreground">
            {match.stage ? formatStage(match.stage) : ""}
            {match.stage && match.matchday ? " · " : ""}
            {match.matchday ? `Matchday ${match.matchday}` : ""}
          </p>
        )}
      </div>

      {/* Teams + score/countdown */}
      <div className="px-4 md:px-8 py-6 md:py-8">
        <div className="flex items-center justify-between gap-2 md:gap-6">
          {/* Home team */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <img
              src={match.homeTeam.crest}
              alt={match.homeTeam.name}
              className="w-14 h-14 md:w-20 md:h-20 object-contain drop-shadow"
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
            />
            <span className="font-bold text-xs md:text-sm text-center leading-tight">
              {match.homeTeam.name}
            </span>
            {data.homeStanding && (
              <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                #{data.homeStanding.position}
              </span>
            )}
            {isFinished && (
              <span className="text-2xl md:text-4xl font-black tabular-nums text-primary">
                {match.homeScore}
              </span>
            )}
            {isLive && (
              <span className="text-2xl md:text-4xl font-black tabular-nums text-primary">
                {match.homeScore ?? 0}
              </span>
            )}
          </div>

          {/* Centre */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            {isUpcoming && cd.total > 0 ? (
              <>
                <div className="flex items-end gap-1.5">
                  <CountdownBox value={cd.h} label="HRS" />
                  <span className="text-xl font-black mb-5 text-muted-foreground">:</span>
                  <CountdownBox value={cd.m} label="MINS" />
                  <span className="text-xl font-black mb-5 text-muted-foreground">:</span>
                  <CountdownBox value={cd.s} label="SECS" />
                </div>
                <p className="text-xs font-semibold text-foreground/70 text-center">
                  {dateStr} · {timeStr}
                </p>
                <p className="text-[10px] text-muted-foreground">Local time</p>
              </>
            ) : isUpcoming ? (
              <span className="text-sm font-bold text-primary">Match Started</span>
            ) : isLive ? (
              <>
                <span className="text-3xl md:text-4xl font-black text-foreground">–</span>
                <span className="flex items-center gap-1 text-xs font-bold text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  {match.period && match.period !== "LIVE" && match.period !== "1H" && match.period !== "2H"
                    ? match.period
                    : match.minute
                      ? `${match.minute}'`
                      : match.period ?? "LIVE"}
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-black text-muted-foreground uppercase tracking-wider">FT</span>
              </>
            )}
          </div>

          {/* Away team */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <img
              src={match.awayTeam.crest}
              alt={match.awayTeam.name}
              className="w-14 h-14 md:w-20 md:h-20 object-contain drop-shadow"
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
            />
            <span className="font-bold text-xs md:text-sm text-center leading-tight">
              {match.awayTeam.name}
            </span>
            {data.awayStanding && (
              <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                #{data.awayStanding.position}
              </span>
            )}
            {isFinished && (
              <span className="text-2xl md:text-4xl font-black tabular-nums">
                {match.awayScore}
              </span>
            )}
            {isLive && (
              <span className="text-2xl md:text-4xl font-black tabular-nums">
                {match.awayScore ?? 0}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Venue */}
      {match.venue && (
        <div className="border-t border-border px-6 py-2.5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {match.venue}
        </div>
      )}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function MatchInfoCard({ data }: { data: MatchDetailsData }) {
  const { match } = data;
  const date = new Date(match.matchDate);
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

  const rows: { label: string; value: string | null | undefined }[] = [
    { label: "Competition", value: match.competition.name },
    { label: "Stage", value: formatStage(match.stage) || null },
    { label: "Matchday", value: match.matchday ? String(match.matchday) : null },
    { label: "Date", value: dateStr },
    { label: "Time", value: timeStr },
    { label: "Venue", value: match.venue },
  ];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden h-fit">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-bold text-sm">Match Info</h3>
      </div>
      <div className="divide-y divide-border">
        {rows.filter(r => r.value).map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-3 px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xs font-medium text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderBadge() {
  return (
    <span className="w-6 h-6 rounded-sm inline-flex items-center justify-center bg-secondary border border-border text-[10px] font-bold text-muted-foreground/40">
      ?
    </span>
  );
}

function RecentFormCard({ data }: { data: MatchDetailsData }) {
  const homeForm = (data.homeStanding?.form ?? "").split("").filter(c => "WDL".includes(c)).slice(-5);
  const awayForm = (data.awayStanding?.form ?? "").split("").filter(c => "WDL".includes(c)).slice(-5);
  const noData = homeForm.length === 0 && awayForm.length === 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-bold text-sm mb-4">Recent Form</h3>
      {noData ? (
        <div className="space-y-3">
          {[data.match.homeTeam, data.match.awayTeam].map((team) => (
            <div key={team.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <img src={team.crest} alt="" className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                <span className="text-xs font-semibold truncate">{team.shortName}</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }, (_, i) => <PlaceholderBadge key={i} />)}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground text-center pt-1">No form data yet for this competition</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[
            { team: data.match.homeTeam, form: homeForm },
            { team: data.match.awayTeam, form: awayForm },
          ].map(({ team, form }) => (
            <div key={team.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <img src={team.crest} alt="" className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                <span className="text-xs font-semibold truncate">{team.shortName}</span>
              </div>
              <div className="flex gap-1">
                {form.length > 0
                  ? form.map((c, i) => <FormBadge key={i} char={c} />)
                  : Array.from({ length: 5 }, (_, i) => <PlaceholderBadge key={i} />)
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function H2HSummaryCard({ data }: { data: MatchDetailsData }) {
  const homeId = data.match.homeTeam.id;
  const awayId = data.match.awayTeam.id;

  const homeWins = data.h2h.filter(m =>
    (m.homeTeam.id === homeId && (m.homeScore ?? 0) > (m.awayScore ?? 0)) ||
    (m.awayTeam.id === homeId && (m.awayScore ?? 0) > (m.homeScore ?? 0))
  ).length;
  const awayWins = data.h2h.filter(m =>
    (m.homeTeam.id === awayId && (m.homeScore ?? 0) > (m.awayScore ?? 0)) ||
    (m.awayTeam.id === awayId && (m.awayScore ?? 0) > (m.homeScore ?? 0))
  ).length;
  const draws = data.h2h.length - homeWins - awayWins;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-bold text-sm mb-4">Head to Head</h3>
      {data.h2h.length === 0 ? (
        <div className="text-center py-3 space-y-2">
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <img src={data.match.homeTeam.crest} alt="" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
            </div>
            <span className="text-muted-foreground font-bold text-sm">vs</span>
            <div className="flex flex-col items-center gap-1">
              <img src={data.match.awayTeam.crest} alt="" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">No previous meetings in this competition</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-center">
            <div className="flex-1">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <img src={data.match.homeTeam.crest} alt="" className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
              </div>
              <span className="text-2xl font-black">{homeWins}</span>
              <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">WINS</p>
            </div>
            <div className="flex-1">
              <span className="text-2xl font-black">{draws}</span>
              <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">DRAWS</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <img src={data.match.awayTeam.crest} alt="" className="w-5 h-5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
              </div>
              <span className="text-2xl font-black">{awayWins}</span>
              <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">WINS</p>
            </div>
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-3">
            Last {data.h2h.length} meeting{data.h2h.length !== 1 ? "s" : ""}
          </p>
        </>
      )}
    </div>
  );
}

function TopPlayersCard({ data }: { data: MatchDetailsData }) {
  const scorers = data.topScorers ?? [];

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-bold text-sm mb-4">Top Players</h3>
      {scorers.length === 0 ? (
        <div className="text-center py-3 space-y-1">
          <p className="text-2xl">⚽</p>
          <p className="text-xs text-muted-foreground">No scoring data available yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {scorers.map((s) => (
            <div key={`${s.player.id}-${s.team.id}`} className="flex items-center gap-3">
              <img
                src={s.team.crest}
                alt=""
                className="w-6 h-6 object-contain flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{s.player.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {s.player.position ?? s.team.shortName}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-sm font-black tabular-nums text-primary">{s.goals}</span>
                <span className="text-[10px] text-muted-foreground">Goals</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchOddsCard({ data }: { data: MatchDetailsData }) {
  const home = data.match.homeTeam.shortName;
  const away = data.match.awayTeam.shortName;
  const outcomes = [
    { key: "1", label: home, sublabel: "Home Win" },
    { key: "X", label: "Draw",  sublabel: "Draw"     },
    { key: "2", label: away,  sublabel: "Away Win" },
  ];
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">Match Odds</h3>
        <span className="text-[11px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5">Not available</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {outcomes.map(({ key, label, sublabel }) => (
          <div
            key={key}
            className="flex flex-col items-center bg-secondary rounded-lg px-2 py-3 gap-1.5"
          >
            <span className="text-xs font-black text-foreground/80 w-5 h-5 flex items-center justify-center bg-background rounded-sm border border-border">
              {key}
            </span>
            <span className="text-lg font-black text-muted-foreground/30 tabular-nums">—</span>
            <span className="text-[10px] text-muted-foreground font-medium text-center truncate w-full text-center">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: MatchDetailsData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Left column */}
      <div className="lg:col-span-3 space-y-4">
        <MatchOddsCard data={data} />
        <RecentFormCard data={data} />
        <H2HSummaryCard data={data} />
        <TopPlayersCard data={data} />
      </div>
      {/* Right column */}
      <div className="lg:col-span-2">
        <MatchInfoCard data={data} />
      </div>
    </div>
  );
}

// ─── H2H tab ──────────────────────────────────────────────────────────────────

function H2HTab({ data }: { data: MatchDetailsData }) {
  const homeId = data.match.homeTeam.id;

  if (data.h2h.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center space-y-2">
        <p className="text-3xl">📊</p>
        <p className="font-semibold">No Head-to-Head Data</p>
        <p className="text-sm text-muted-foreground">No recorded meetings between these teams in this competition.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-bold text-sm">Previous Meetings</h3>
      </div>
      <div className="divide-y divide-border">
        {data.h2h.map((m) => {
          const dateStr = new Date(m.matchDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
          const homeWin = (m.homeScore ?? 0) > (m.awayScore ?? 0);
          const awayWin = (m.awayScore ?? 0) > (m.homeScore ?? 0);
          const refHomeWin = m.homeTeam.id === homeId ? homeWin : awayWin;
          const refAwayWin = m.awayTeam.id !== homeId ? homeWin : awayWin;
          const result = refHomeWin ? "W" : refAwayWin ? "L" : "D";
          return (
            <div key={m.id} className="px-4 py-3 flex items-center gap-3 text-xs">
              <span className="text-muted-foreground w-24 flex-shrink-0">{dateStr}</span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <img src={m.homeTeam.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                <span className="truncate font-medium">{m.homeTeam.shortName}</span>
              </div>
              <span className="font-black tabular-nums w-14 text-center text-sm">
                {m.homeScore} – {m.awayScore}
              </span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                <span className="truncate font-medium">{m.awayTeam.shortName}</span>
                <img src={m.awayTeam.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
              </div>
              <FormBadge char={result} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Standings tab ────────────────────────────────────────────────────────────

function StandingsTable({ rows, highlighted }: { rows: LiveStanding[]; highlighted: Set<number> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="border-b border-border bg-secondary/40">
          <tr>
            {["#", "Team", "P", "W", "D", "L", "GD", "Pts"].map((h, i) => (
              <th key={h} className={`px-2 py-2.5 font-semibold text-muted-foreground ${i === 1 ? "text-left" : "text-center"} ${i >= 6 ? "hidden sm:table-cell" : ""} ${i === 7 ? "!table-cell" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr
              key={row.team.id}
              className={`transition-colors ${highlighted.has(row.team.id) ? "bg-primary/10 font-semibold" : "hover:bg-secondary/30"}`}
            >
              <td className="px-2 py-2 text-center text-muted-foreground w-8">{row.position}</td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-1.5">
                  <img src={row.team.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                  <span className="truncate max-w-[80px] sm:max-w-none">{row.team.shortName}</span>
                </div>
              </td>
              <td className="px-2 py-2 text-center">{row.played}</td>
              <td className="px-2 py-2 text-center">{row.won}</td>
              <td className="px-2 py-2 text-center">{row.drawn}</td>
              <td className="px-2 py-2 text-center">{row.lost}</td>
              <td className="px-2 py-2 text-center hidden sm:table-cell">
                {row.goalDifference > 0 ? "+" : ""}{row.goalDifference}
              </td>
              <td className="px-2 py-2 text-center font-bold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StandingsTab({ data }: { data: MatchDetailsData }) {
  const { standings, match } = data;

  if (standings.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center space-y-2">
        <p className="text-3xl">🏆</p>
        <p className="font-semibold">Standings Not Available</p>
        <p className="text-sm text-muted-foreground">Not applicable for this competition format.</p>
      </div>
    );
  }

  const highlighted = new Set([match.homeTeam.id, match.awayTeam.id]);
  const isMultiGroup = standings.some(r => r.group != null);

  if (isMultiGroup) {
    // Find which groups the two teams belong to
    const homeGroup = standings.find(r => r.team.id === match.homeTeam.id)?.group;
    const awayGroup = standings.find(r => r.team.id === match.awayTeam.id)?.group;
    const relevantGroups = new Set([homeGroup, awayGroup].filter(Boolean));

    // Group rows by their group label, only keeping relevant groups
    const groupMap = new Map<string, typeof standings>();
    for (const row of standings) {
      const g = row.group ?? "";
      if (!relevantGroups.has(g)) continue;
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)!.push(row);
    }

    if (groupMap.size === 0) {
      // Fallback: show flat table if we can't determine groups
      return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <StandingsTable rows={standings} highlighted={highlighted} />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Array.from(groupMap.entries()).map(([groupName, rows]) => (
          <div key={groupName} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{groupName}</h3>
            </div>
            <StandingsTable rows={rows} highlighted={highlighted} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <StandingsTable rows={standings} highlighted={highlighted} />
    </div>
  );
}

// ─── Lineups tab ──────────────────────────────────────────────────────────────

function LineupSide({ side, team }: { side: "home" | "away"; team: TeamLineup }) {
  return (
    <div className={`flex-1 space-y-3 ${side === "away" ? "text-right" : ""}`}>
      <div className={`flex items-center gap-2 ${side === "away" ? "flex-row-reverse" : ""}`}>
        <span className="text-xs font-bold truncate">{team.name}</span>
        {team.formation && (
          <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded flex-shrink-0">{team.formation}</span>
        )}
      </div>
      <div className="space-y-1">
        {team.startingXI.map((p, i) => (
          <div key={p.id} className={`flex items-center gap-2 text-xs ${side === "away" ? "flex-row-reverse" : ""}`}>
            <span className="w-5 h-5 rounded-sm bg-secondary flex items-center justify-center text-[10px] font-black text-muted-foreground flex-shrink-0">
              {p.shirtNumber ?? i + 1}
            </span>
            <span className="truncate font-medium">{p.name}</span>
            {p.position && (
              <span className="text-[9px] text-muted-foreground flex-shrink-0">{p.position}</span>
            )}
          </div>
        ))}
      </div>
      {team.bench.length > 0 && (
        <>
          <p className={`text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-1 border-t border-border ${side === "away" ? "text-right" : ""}`}>Bench</p>
          <div className="space-y-1">
            {team.bench.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-2 text-xs text-muted-foreground ${side === "away" ? "flex-row-reverse" : ""}`}>
                <span className="w-5 h-5 rounded-sm bg-secondary/50 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {p.shirtNumber ?? i + 12}
                </span>
                <span className="truncate">{p.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LineupsTab({ data }: { data: MatchDetailsData }) {
  if (!data.lineups) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
        <p className="text-4xl">📋</p>
        <p className="font-bold text-base">Lineups Not Yet Available</p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">Lineups are typically announced 1 hour before kickoff.</p>
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="font-bold text-sm mb-4 text-center">Starting Lineups</h3>
      <div className="flex gap-4">
        <LineupSide side="home" team={data.lineups.homeTeam} />
        <div className="w-px bg-border flex-shrink-0" />
        <LineupSide side="away" team={data.lineups.awayTeam} />
      </div>
    </div>
  );
}

// ─── Unavailable tabs ─────────────────────────────────────────────────────────

function UnavailableTab({ icon, label, detail }: { icon: string; label: string; detail: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
      <p className="text-4xl">{icon}</p>
      <p className="font-bold text-base">{label}</p>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">{detail}</p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MatchDetailsSkeleton() {
  return (
    <div className="space-y-4 pb-10">
      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        <Skeleton className="h-5 w-48 mx-auto" />
        <div className="flex items-center justify-between gap-6">
          <div className="flex flex-col items-center gap-3 flex-1">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Skeleton className="w-14 h-12 rounded-lg" />
                <Skeleton className="h-2 w-8" />
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-3 flex-1">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      <div className="flex gap-1 border-b border-border">
        {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-9 w-20 rounded-none" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "lineups" | "stats" | "h2h" | "standings";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",  label: "Overview" },
  { id: "lineups",   label: "Lineups"  },
  { id: "stats",     label: "Stats"    },
  { id: "h2h",       label: "H2H"      },
  { id: "standings", label: "Table"    },
];

// ─── Share button ─────────────────────────────────────────────────────────────

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5"
    >
      <Share2 className="w-3.5 h-3.5" />
      {copied ? "Copied!" : "Share"}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MatchDetails() {
  const { matchId } = useParams<{ matchId: string }>();
  const search = useSearch();
  const league = new URLSearchParams(search).get("league") ?? "";
  const [tab, setTab] = useState<Tab>("overview");

  const { data, isLoading, isError, refetch } = useQuery<MatchDetailsData>({
    queryKey: ["match-details", matchId, league],
    queryFn: () =>
      apiFetch(`/api/live/match/${matchId}?league=${encodeURIComponent(league)}`),
    staleTime: 60_000,
    refetchInterval: (q) =>
      (q.state.data as MatchDetailsData | undefined)?.match.status === "live"
        ? 30_000
        : 60_000,
    retry: 2,
    enabled: !!matchId && !!league,
  });

  if (!matchId || !league) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-4xl">❌</p>
        <p className="font-bold text-lg">Invalid match link</p>
        <Link href="/" className="text-primary hover:underline text-sm">← Back to home</Link>
      </div>
    );
  }

  if (isLoading) return <MatchDetailsSkeleton />;

  if (isError || !data) {
    return (
      <div className="space-y-4 pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <ErrorState message="Match data unavailable" onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/league/${league}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to fixtures
        </Link>
        <ShareButton />
      </div>

      {/* Match header */}
      <MatchHeader data={data} />

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto gap-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 md:px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tab === "overview"   && <OverviewTab data={data} />}
      {tab === "lineups"    && <LineupsTab data={data} />}
      {tab === "stats"      && <UnavailableTab icon="📊" label="Match Stats Not Available" detail="Live match statistics are not available on the free API tier." />}
      {tab === "h2h"        && <H2HTab data={data} />}
      {tab === "standings"  && <StandingsTab data={data} />}
    </div>
  );
}
