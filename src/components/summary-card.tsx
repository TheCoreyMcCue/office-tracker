"use client";

import { cn } from "@/lib/utils";
import { OFFICE_TARGET_RATIO, type MonthStats } from "@/lib/calendar";

export function SummaryCard({ stats }: { stats: MonthStats }) {
  const ratio =
    stats.targetDays > 0 ? stats.inOfficeCount / stats.targetDays : 0;
  const displayPct = Math.round(stats.percentageAchieved * 100);
  const targetPct = Math.round(OFFICE_TARGET_RATIO * 100);
  const ringPct = Math.min(1, ratio);
  const onTrack = stats.onTrack;

  return (
    <div className="relative rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] p-5 overflow-hidden">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-5 -top-px h-px bg-gradient-to-r from-transparent to-transparent",
          onTrack ? "via-emerald-400/60" : "via-indigo-400/60",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl opacity-30",
          onTrack ? "bg-emerald-500" : "bg-indigo-500",
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
            onTrack
              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/40"
              : "bg-amber-500/15 text-amber-200 ring-amber-400/40",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              onTrack ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
            )}
          />
          {onTrack ? "On track" : `${stats.remainingToTarget} to go`}
        </span>
      </div>

      <div className="relative mt-5 flex items-center gap-5">
        <ProgressRing
          ratio={ringPct}
          onTrack={onTrack}
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

      <dl className="relative mt-5 grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
        <Stat label="Holidays" value={stats.holidays.length} />
        <Stat label="PTO" value={stats.ptoDays} />
        <Stat label="Workable" value={stats.workableDays} accent />
      </dl>
    </div>
  );
}

function ProgressRing({
  ratio,
  onTrack,
  centerLabel,
}: {
  ratio: number;
  onTrack: boolean;
  centerLabel: string;
}) {
  const size = 88;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ratio);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        aria-hidden
        className={cn(
          "absolute inset-1 rounded-full blur-xl opacity-40",
          onTrack ? "bg-emerald-500" : "bg-indigo-500",
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
            onTrack ? "text-emerald-400" : "text-indigo-400",
          )}
          fill="none"
          style={{
            filter: onTrack
              ? "drop-shadow(0 0 6px rgba(52,211,153,0.6))"
              : "drop-shadow(0 0 6px rgba(129,140,248,0.6))",
          }}
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
