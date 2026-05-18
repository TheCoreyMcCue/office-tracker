"use client";

import { cn } from "@/lib/utils";
import { OFFICE_TARGET_RATIO, type MonthStats } from "@/lib/calendar";

// Yellow ("tight") if the buffer of extra working days beyond what's needed
// is at this number or fewer. 2 days felt right at the default 60% policy —
// adjust here if the threshold should change.
const TIGHT_BUFFER_DAYS = 2;

type Status = "achieved" | "good" | "tight" | "behind";

function deriveStatus(stats: MonthStats): Status {
  if (stats.onTrack) return "achieved";
  if (stats.remainingToTarget > stats.workingDaysLeft) return "behind";
  if (stats.workingDaysLeft - stats.remainingToTarget <= TIGHT_BUFFER_DAYS)
    return "tight";
  return "good";
}

const STATUS_STYLES: Record<
  Status,
  { badge: string; dot: string; ring: string; glow: string }
> = {
  achieved: {
    badge: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/40",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
    ring: "text-emerald-400",
    glow: "bg-emerald-500",
  },
  good: {
    badge: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/40",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
    ring: "text-emerald-400",
    glow: "bg-emerald-500",
  },
  tight: {
    badge: "bg-amber-500/15 text-amber-200 ring-amber-400/40",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
    ring: "text-amber-400",
    glow: "bg-amber-500",
  },
  behind: {
    badge: "bg-red-500/15 text-red-200 ring-red-400/40",
    dot: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]",
    ring: "text-red-400",
    glow: "bg-red-500",
  },
};

const RING_DROP_SHADOW: Record<Status, string> = {
  achieved: "drop-shadow(0 0 6px rgba(52,211,153,0.6))",
  good: "drop-shadow(0 0 6px rgba(52,211,153,0.6))",
  tight: "drop-shadow(0 0 6px rgba(251,191,36,0.6))",
  behind: "drop-shadow(0 0 6px rgba(248,113,113,0.6))",
};

export function SummaryCard({ stats }: { stats: MonthStats }) {
  const ratio =
    stats.targetDays > 0 ? stats.inOfficeCount / stats.targetDays : 0;
  const ringPct = Math.min(1, ratio);
  const displayPct = Math.round(ringPct * 100);
  const targetPct = Math.round(OFFICE_TARGET_RATIO * 100);
  const status = deriveStatus(stats);
  const styles = STATUS_STYLES[status];
  const badgeLabel =
    status === "achieved"
      ? "On track"
      : status === "behind"
        ? `${stats.remainingToTarget} short`
        : `${stats.remainingToTarget} to go`;

  return (
    <div className="relative rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] p-5 overflow-hidden">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-5 -top-px h-px bg-gradient-to-r from-transparent to-transparent",
          status === "behind"
            ? "via-red-400/60"
            : status === "tight"
              ? "via-amber-400/60"
              : "via-emerald-400/60",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl opacity-30",
          styles.glow,
        )}
      />

      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            This month
          </div>
          <div className="text-sm text-slate-300 mt-1">
            Target {targetPct}% of workable days
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ring-1",
            styles.badge,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
          {badgeLabel}
        </span>
      </div>

      <div className="relative mt-5 flex items-center gap-5">
        <ProgressRing
          ratio={ringPct}
          status={status}
          centerLabel={`${displayPct}%`}
        />
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-6xl font-semibold tabular-nums tracking-[-0.04em] text-white leading-none">
              {stats.inOfficeCount}
            </span>
            <span className="text-3xl font-light text-slate-500 tabular-nums">
              /
            </span>
            <span className="text-3xl font-medium text-slate-300 tabular-nums">
              {stats.targetDays}
            </span>
          </div>
          <div className="text-sm text-slate-300 mt-2">
            days in office vs target
          </div>
        </div>
      </div>

      <dl className="relative mt-5 grid grid-cols-[1fr_1.4fr_1fr] gap-x-8 pt-4 border-t border-white/10">
        <Stat label="Holidays" value={stats.holidays.length} />
        <div className="grid grid-cols-2 gap-x-3">
          <Stat label="PTO" value={stats.ptoDays} />
          <Stat label="Sick" value={stats.sickDays} />
        </div>
        <Stat label="Workable" value={stats.workableDays} accent />
      </dl>
    </div>
  );
}

function ProgressRing({
  ratio,
  status,
  centerLabel,
}: {
  ratio: number;
  status: Status;
  centerLabel: string;
}) {
  const size = 88;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ratio);
  const styles = STATUS_STYLES[status];

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        aria-hidden
        className={cn(
          "absolute inset-1 rounded-full blur-xl opacity-40",
          styles.glow,
        )}
      />
      <svg width={size} height={size} className="relative -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/10"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn(
            "transition-[stroke-dashoffset] duration-700 ease-out",
            styles.ring,
          )}
          fill="none"
          style={{ filter: RING_DROP_SHADOW[status] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold tabular-nums text-white tracking-tight">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
          accent ? "text-indigo-300" : "text-white",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
