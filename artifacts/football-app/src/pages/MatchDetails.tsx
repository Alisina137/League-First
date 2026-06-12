import { useState, useEffect } from "react";
import { useParams, useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, type MatchDetailsData, type LiveMatch, type LiveStanding } from "../lib/liveApi";
import { Skeleton, ErrorState } from "../components/Skeleton";
import { ChevronLeft } from "lucide-react";

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

function formatStage(stage?: string | null): string {
  if (!stage) return "";
  return (
    STAGE_LABELS[stage] ??
    stage
      .split("_")
      .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")
  );
}

function useCountdown(targetDate: string): string | null {
  const [remaining, setRemaining] = useState(
    new Date(targetDate).getTime() - Date.now()
  );
  useEffect(() => {
    const t = setInterval(
      () => setRemaining(new Date(targetDate).getTime() - Date.now()),
      1000
    );
    return () => clearInterval(t);
  }, [targetDate]);

  if (remaining <= 0) return null;
  const d = Math.floor(remaining / 86_400_000);
  const h = Math.floor((remaining % 86_400_000) / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1_000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Form badge ──────────────────────────────────────────────────────────────

function FormBadge({ char }: { char: string }) {
  const cls =
    char === "W"
      ? "bg-green-500 text-white"
      : char === "L"
      ? "bg-red-500 text-white"
      : "bg-yellow-400 text-black";
  return (
    <span
      className={`${cls} text-[10px] font-bold w-5 h-5 rounded-full inline-flex items-center justify-center`}
    >
      {char}
    </span>
  );
}

function TeamForm({
  form,
  crest,
  name,
}: {
  form: string | null;
  crest: string;
  name: string;
}) {
  const chars = (form ?? "").split("").slice(-5);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <img
          src={crest}
          alt={name}
          className="w-5 h-5 object-contain flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = "0.3";
          }}
        />
        <span className="text-sm font-semibold truncate">{name}</span>
      </div>
      <div className="flex items-center gap-1">
        {chars.length > 0 ? (
          chars.map((c, i) => <FormBadge key={i} char={c} />)
        ) : (
          <span className="text-xs text-muted-foreground">No form data</span>
        )}
      </div>
    </div>
  );
}

// ─── Match header ─────────────────────────────────────────────────────────────

function MatchHeader({ data }: { data: MatchDetailsData }) {
  const { match } = data;
  const countdown = useCountdown(match.matchDate);
  const date = new Date(match.matchDate);
  const dateStr = date.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Competition bar */}
      <div className="bg-secondary/50 px-5 py-3 flex items-center justify-center gap-2">
        <img
          src={match.competition.emblem}
          alt={match.competition.name}
          className="w-5 h-5 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="text-sm font-semibold">{match.competition.name}</span>
        {match.stage && (
          <>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-sm text-muted-foreground">
              {formatStage(match.stage)}
            </span>
          </>
        )}
        {match.matchday && (
          <>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-sm text-muted-foreground">
              MD {match.matchday}
            </span>
          </>
        )}
      </div>

      {/* Teams + score */}
      <div className="px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          {/* Home team */}
          <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
            <img
              src={match.homeTeam.crest}
              alt={match.homeTeam.name}
              className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = "0.3";
              }}
            />
            <span className="font-bold text-sm md:text-base text-center leading-tight">
              {match.homeTeam.name}
            </span>
            {data.homeStanding && (
              <span className="text-xs text-muted-foreground">
                #{data.homeStanding.position}
              </span>
            )}
          </div>

          {/* Centre: score or countdown */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0 px-2">
            {match.status === "live" ? (
              <>
                <div className="text-4xl md:text-5xl font-black tabular-nums text-primary leading-none">
                  {match.homeScore ?? 0} – {match.awayScore ?? 0}
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-primary mt-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  {match.minute ? `${match.minute}'` : "LIVE"}
                </span>
              </>
            ) : match.status === "finished" ? (
              <>
                <div className="text-4xl md:text-5xl font-black tabular-nums leading-none">
                  {match.homeScore} – {match.awayScore}
                </div>
                <span className="text-xs text-muted-foreground font-semibold mt-1 uppercase tracking-wide">
                  Full Time
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl md:text-3xl font-black text-muted-foreground">
                  vs
                </span>
                {countdown ? (
                  <span className="text-sm font-bold text-primary mt-1 tabular-nums">
                    {countdown}
                  </span>
                ) : (
                  <span className="text-xs text-primary font-bold mt-1">
                    Match Started
                  </span>
                )}
              </>
            )}
          </div>

          {/* Away team */}
          <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
            <img
              src={match.awayTeam.crest}
              alt={match.awayTeam.name}
              className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = "0.3";
              }}
            />
            <span className="font-bold text-sm md:text-base text-center leading-tight">
              {match.awayTeam.name}
            </span>
            {data.awayStanding && (
              <span className="text-xs text-muted-foreground">
                #{data.awayStanding.position}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: venue + date */}
      <div className="border-t border-border px-5 py-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {match.venue && (
          <span className="flex items-center gap-1">
            <span>📍</span>
            {match.venue}
          </span>
        )}
        <span className="flex items-center gap-1">
          <span>📅</span>
          {dateStr} · {timeStr}
        </span>
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function OverviewTab({ data }: { data: MatchDetailsData }) {
  const { match } = data;
  const date = new Date(match.matchDate);
  const dateStr = date.toLocaleDateString([], {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const homeWins = data.h2h.filter(
    (m) =>
      (m.homeTeam.id === match.homeTeam.id &&
        (m.homeScore ?? 0) > (m.awayScore ?? 0)) ||
      (m.awayTeam.id === match.homeTeam.id &&
        (m.awayScore ?? 0) > (m.homeScore ?? 0))
  ).length;
  const awayWins = data.h2h.filter(
    (m) =>
      (m.homeTeam.id === match.awayTeam.id &&
        (m.homeScore ?? 0) > (m.awayScore ?? 0)) ||
      (m.awayTeam.id === match.awayTeam.id &&
        (m.awayScore ?? 0) > (m.homeScore ?? 0))
  ).length;
  const draws = data.h2h.length - homeWins - awayWins;

  return (
    <div className="space-y-5">
      {/* Match information */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-bold mb-3">Match Information</h3>
        <InfoRow label="Competition" value={match.competition.name} />
        <InfoRow label="Stage" value={formatStage(match.stage)} />
        {match.matchday && (
          <InfoRow label="Matchday" value={`Matchday ${match.matchday}`} />
        )}
        <InfoRow label="Date" value={dateStr} />
        <InfoRow label="Kickoff" value={timeStr} />
        <InfoRow label="Venue" value={match.venue ?? undefined} />
      </div>

      {/* Team form */}
      {(data.homeStanding?.form || data.awayStanding?.form) && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-bold mb-4">Recent Form</h3>
          <div className="space-y-4">
            <TeamForm
              form={data.homeStanding?.form ?? null}
              crest={match.homeTeam.crest}
              name={match.homeTeam.shortName}
            />
            <TeamForm
              form={data.awayStanding?.form ?? null}
              crest={match.awayTeam.crest}
              name={match.awayTeam.shortName}
            />
          </div>
        </div>
      )}

      {/* H2H summary */}
      {data.h2h.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-bold mb-4">
            Head to Head{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (this competition)
            </span>
          </h3>
          <div className="flex items-center justify-between text-center">
            <div className="flex-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                <img
                  src={match.homeTeam.crest}
                  alt=""
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0.3";
                  }}
                />
                <span className="text-xs text-muted-foreground truncate">
                  {match.homeTeam.shortName}
                </span>
              </div>
              <span className="text-2xl font-black">{homeWins}</span>
              <p className="text-xs text-muted-foreground mt-0.5">Wins</p>
            </div>
            <div className="flex-1">
              <span className="text-2xl font-black">{draws}</span>
              <p className="text-xs text-muted-foreground mt-0.5">Draws</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-center gap-2 mb-1">
                <img
                  src={match.awayTeam.crest}
                  alt=""
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0.3";
                  }}
                />
                <span className="text-xs text-muted-foreground truncate">
                  {match.awayTeam.shortName}
                </span>
              </div>
              <span className="text-2xl font-black">{awayWins}</span>
              <p className="text-xs text-muted-foreground mt-0.5">Wins</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── H2H tab ──────────────────────────────────────────────────────────────────

function H2HTab({
  h2h,
  homeTeamId,
}: {
  h2h: LiveMatch[];
  homeTeamId: number;
}) {
  if (h2h.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center space-y-2">
        <p className="text-2xl">📊</p>
        <p className="font-semibold">No Head-to-Head Data</p>
        <p className="text-sm text-muted-foreground">
          No recorded meetings between these teams in this competition.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-bold">Previous Meetings</h3>
      </div>
      <div className="divide-y divide-border">
        {h2h.map((m) => {
          const date = new Date(m.matchDate).toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const isHomeWin =
            (m.homeScore ?? 0) > (m.awayScore ?? 0);
          const isAwayWin =
            (m.awayScore ?? 0) > (m.homeScore ?? 0);
          const refHomeWin =
            m.homeTeam.id === homeTeamId ? isHomeWin : isAwayWin;
          const refAwayWin =
            m.awayTeam.id !== homeTeamId ? isHomeWin : isAwayWin;
          const result = refHomeWin
            ? "W"
            : refAwayWin
            ? "L"
            : "D";
          return (
            <div
              key={m.id}
              className="px-4 py-3 flex items-center gap-3 text-sm"
            >
              <span className="text-xs text-muted-foreground w-24 flex-shrink-0">
                {date}
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <img
                  src={m.homeTeam.crest}
                  alt=""
                  className="w-4 h-4 object-contain flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0.3";
                  }}
                />
                <span className="truncate font-medium">
                  {m.homeTeam.shortName}
                </span>
              </div>
              <span className="font-bold tabular-nums flex-shrink-0 w-12 text-center">
                {m.homeScore} – {m.awayScore}
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span className="truncate font-medium">
                  {m.awayTeam.shortName}
                </span>
                <img
                  src={m.awayTeam.crest}
                  alt=""
                  className="w-4 h-4 object-contain flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0.3";
                  }}
                />
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

function StandingsTab({
  standings,
  homeTeamId,
  awayTeamId,
}: {
  standings: LiveStanding[];
  homeTeamId: number;
  awayTeamId: number;
}) {
  if (standings.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center space-y-2">
        <p className="text-2xl">🏆</p>
        <p className="font-semibold">Standings Not Available</p>
        <p className="text-sm text-muted-foreground">
          Standings are not available for this competition format.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-border bg-secondary/40">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground w-7">
                #
              </th>
              <th className="px-2 py-2.5 text-left font-semibold text-muted-foreground">
                Team
              </th>
              <th className="px-2 py-2.5 text-center font-semibold text-muted-foreground">
                P
              </th>
              <th className="px-2 py-2.5 text-center font-semibold text-muted-foreground">
                W
              </th>
              <th className="px-2 py-2.5 text-center font-semibold text-muted-foreground">
                D
              </th>
              <th className="px-2 py-2.5 text-center font-semibold text-muted-foreground">
                L
              </th>
              <th className="px-2 py-2.5 text-center font-semibold text-muted-foreground hidden sm:table-cell">
                GD
              </th>
              <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">
                Pts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {standings.map((row) => {
              const isHighlighted =
                row.team.id === homeTeamId || row.team.id === awayTeamId;
              return (
                <tr
                  key={row.team.id}
                  className={`transition-colors ${
                    isHighlighted
                      ? "bg-primary/10 font-semibold"
                      : "hover:bg-secondary/30"
                  }`}
                >
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.position}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={row.team.crest}
                        alt=""
                        className="w-4 h-4 object-contain flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = "0.3";
                        }}
                      />
                      <span className="truncate max-w-[90px] sm:max-w-none">
                        {row.team.shortName}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">{row.played}</td>
                  <td className="px-2 py-2 text-center">{row.won}</td>
                  <td className="px-2 py-2 text-center">{row.drawn}</td>
                  <td className="px-2 py-2 text-center">{row.lost}</td>
                  <td className="px-2 py-2 text-center hidden sm:table-cell">
                    {row.goalDifference > 0 ? "+" : ""}
                    {row.goalDifference}
                  </td>
                  <td className="px-3 py-2 text-center font-bold">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Unavailable tab placeholder ──────────────────────────────────────────────

function UnavailableTab({ icon, label, detail }: { icon: string; label: string; detail: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-12 text-center space-y-3">
      <p className="text-4xl">{icon}</p>
      <p className="font-bold text-lg">{label}</p>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">{detail}</p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MatchDetailsSkeleton() {
  return (
    <div className="space-y-5 pb-10">
      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        <Skeleton className="h-5 w-48 mx-auto" />
        <div className="flex items-center justify-between gap-6">
          <div className="flex flex-col items-center gap-2 flex-1">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-20" />
          <div className="flex flex-col items-center gap-2 flex-1">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-4 w-56 mx-auto" />
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 flex-1 rounded-lg" />
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "h2h" | "standings" | "lineups" | "stats" | "news";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "lineups", label: "Lineups" },
  { id: "stats", label: "Stats" },
  { id: "h2h", label: "H2H" },
  { id: "standings", label: "Standings" },
  { id: "news", label: "News" },
];

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
        <Link href="/" className="text-primary hover:underline text-sm">
          ← Back to home
        </Link>
      </div>
    );
  }

  if (isLoading) return <MatchDetailsSkeleton />;

  if (isError || !data) {
    return (
      <div className="space-y-4 pb-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <ErrorState
          message="Match data unavailable"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Back button */}
      <Link
        href={`/league/${league}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {data.match.competition.name}
      </Link>

      {/* Match header */}
      <MatchHeader data={data} />

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && <OverviewTab data={data} />}

      {tab === "lineups" && (
        <UnavailableTab
          icon="📋"
          label="Lineups Not Yet Available"
          detail="Lineups are typically announced 1 hour before kickoff. Check back closer to the match."
        />
      )}

      {tab === "stats" && (
        <UnavailableTab
          icon="📊"
          label="Match Stats Not Available"
          detail="Live match statistics will appear here once the match is underway."
        />
      )}

      {tab === "h2h" && (
        <H2HTab
          h2h={data.h2h}
          homeTeamId={data.match.homeTeam.id}
        />
      )}

      {tab === "standings" && (
        <StandingsTab
          standings={data.standings}
          homeTeamId={data.match.homeTeam.id}
          awayTeamId={data.match.awayTeam.id}
        />
      )}

      {tab === "news" && (
        <UnavailableTab
          icon="📰"
          label="No News Available"
          detail="Match-related news articles will appear here when available."
        />
      )}
    </div>
  );
}
