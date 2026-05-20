"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toISODate, type PeriodStats } from "@/lib/calendar";
import {
  getWeekdaysInPeriod,
  type ReportingPeriod,
} from "@/lib/reporting-periods";
import type { DayMark } from "@/lib/repo";
import type { UserDates } from "./tracker-app";

type Props = {
  period: ReportingPeriod;
  stats: PeriodStats;
  dates: UserDates;
  mode: DayMark;
  onToggle: (iso: string) => void;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const MARK_CLASSES: Record<DayMark, string> = {
  office:
    "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white ring-1 ring-emerald-300/40 shadow-[0_0_18px_-4px_rgba(52,211,153,0.55)] hover:shadow-[0_0_26px_-2px_rgba(52,211,153,0.75)]",
  pto: "bg-gradient-to-br from-sky-400 to-sky-600 text-white ring-1 ring-sky-300/40 shadow-[0_0_18px_-4px_rgba(56,189,248,0.55)] hover:shadow-[0_0_26px_-2px_rgba(56,189,248,0.75)]",
  sick: "bg-gradient-to-br from-rose-400 to-rose-600 text-white ring-1 ring-rose-300/40 shadow-[0_0_18px_-4px_rgba(251,113,133,0.55)] hover:shadow-[0_0_26px_-2px_rgba(251,113,133,0.75)]",
};

const LEGEND_SWATCHES: { label: string; className: string }[] = [
  {
    label: "Office",
    className: "bg-gradient-to-br from-emerald-400 to-emerald-600",
  },
  { label: "PTO", className: "bg-gradient-to-br from-sky-400 to-sky-600" },
  { label: "Sick", className: "bg-gradient-to-br from-rose-400 to-rose-600" },
  {
    label: "Holiday",
    className: "bg-amber-500/15 ring-1 ring-amber-400/30",
  },
];

export function PeriodCalendar({
  period,
  stats,
  dates,
  mode,
  onToggle,
}: Props) {
  const weekdays = getWeekdaysInPeriod(period);
  const holidayMap = new Map(stats.holidays.map((h) => [h.date, h.name]));
  const inOfficeSet = new Set(dates.inOfficeDates);
  const ptoSet = new Set(dates.ptoDates);
  const sickSet = new Set(dates.sickDates);
  const today = toISODate(new Date());

  function getMark(iso: string): DayMark | null {
    if (inOfficeSet.has(iso)) return "office";
    if (ptoSet.has(iso)) return "pto";
    if (sickSet.has(iso)) return "sick";
    return null;
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="grid grid-cols-5 gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1 flex-1 min-h-0 auto-rows-fr">
        {weekdays.map((date) => {
          const iso = toISODate(date);
          const holidayName = holidayMap.get(iso);
          const isHoliday = Boolean(holidayName);
          const mark = getMark(iso);
          const isToday = iso === today;
          const willClear = mark === mode;

          const title = isHoliday
            ? holidayName
            : mark
              ? willClear
                ? `Click to clear (${mark})`
                : `Marked ${mark} — click to change to ${mode}`
              : `Click to mark as ${mode}`;

          return (
            <button
              key={iso}
              type="button"
              disabled={isHoliday}
              onClick={() => onToggle(iso)}
              title={title}
              className={cn(
                "group relative min-h-12 rounded-xl text-base flex flex-col items-center justify-center transition-all duration-150 p-1",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                isHoliday &&
                  "bg-amber-500/15 text-amber-200 cursor-not-allowed ring-1 ring-amber-400/30",
                !isHoliday &&
                  !mark &&
                  "bg-slate-800/70 text-slate-100 ring-1 ring-white/10 hover:bg-slate-800 hover:ring-white/20 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.5)]",
                !isHoliday && mark && MARK_CLASSES[mark],
                !isHoliday && mark && "hover:-translate-y-0.5",
                isToday &&
                  !mark &&
                  !isHoliday &&
                  "ring-2 ring-indigo-400/70 shadow-[0_0_12px_-2px_rgba(99,102,241,0.5)]",
              )}
            >
              <span className="font-semibold tabular-nums leading-none">
                {date.getDate()}
              </span>
              {isHoliday && (
                <span className="mt-0.5 text-[10px] leading-tight font-medium">
                  Holiday
                </span>
              )}
              {mark && (
                <Check
                  className="absolute top-1 right-1 h-3 w-3 opacity-80"
                  strokeWidth={3}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-300">
        {LEGEND_SWATCHES.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className={cn("inline-block h-3 w-3 rounded-md", s.className)} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
