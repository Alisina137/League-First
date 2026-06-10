interface UpcomingEmptyStateProps {
  nextFixtureDate?: string | null;
  hasStarted?: boolean;
  isTournament?: boolean;
  competitionName?: string;
  competitionEmblem?: string;
  context?: "global" | "competition" | "filter";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(iso: string): number {
  return Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function CountdownBadge({ iso }: { iso: string }) {
  const days = daysUntil(iso);
  const label =
    days <= 0 ? "Starting today!" : days === 1 ? "1 day remaining" : `${days} days remaining`;
  return (
    <div className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full">
      ⏰ {label}
    </div>
  );
}

export function UpcomingEmptyState({
  nextFixtureDate = null,
  hasStarted = true,
  isTournament = false,
  competitionName,
  competitionEmblem,
  context = "global",
}: UpcomingEmptyStateProps) {
  const hasFutureFixture = !!nextFixtureDate;
  const showCompetitionHeader = context === "competition" && competitionName;

  // ── STATE 3: Tournament / Season hasn't started yet ──────────────────────
  if (!hasStarted && hasFutureFixture) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center gap-3">
        {competitionEmblem ? (
          <img
            src={competitionEmblem}
            alt={competitionName}
            className="w-12 h-12 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
          />
        ) : (
          <div className="text-4xl">🏆</div>
        )}

        <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          {isTournament ? "🏆 Tournament Starts Soon" : "⚽ Season Starts Soon"}
        </div>

        {showCompetitionHeader && (
          <p className="font-bold text-base">{competitionName}</p>
        )}

        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">
            {isTournament ? "Tournament begins" : "First fixture"}
          </p>
          <p className="font-semibold text-sm">{formatDate(nextFixtureDate!)}</p>
        </div>

        <CountdownBadge iso={nextFixtureDate!} />
      </div>
    );
  }

  // ── STATE 2: Has started, but gap — next fixture exists ───────────────────
  if (hasStarted && hasFutureFixture) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center gap-3">
        <div className="text-4xl">📅</div>
        <p className="font-bold text-sm">Coming Soon</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          No matches are scheduled within the next 10 days.
        </p>
        <div className="space-y-0.5">
          <p className="text-[11px] text-muted-foreground">Next match scheduled</p>
          <p className="font-semibold text-sm text-primary">{formatDate(nextFixtureDate!)}</p>
        </div>
      </div>
    );
  }

  // ── STATE 4: Season completed — no future fixtures ────────────────────────
  if (hasStarted && !hasFutureFixture) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center gap-3">
        <div className="text-4xl">🏁</div>
        <p className="font-bold text-sm">Season Completed</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          No remaining fixtures this season.
          <br />
          Check back when the new season schedule is released.
        </p>
      </div>
    );
  }

  // ── STATE 5: Fallback — API empty / no data ───────────────────────────────
  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center gap-3">
      <div className="text-4xl">📅</div>
      <p className="font-bold text-sm">Coming Soon</p>
      <p className="text-[11px] text-muted-foreground">
        Schedule not yet announced. Fixtures will appear here automatically.
      </p>
    </div>
  );
}
