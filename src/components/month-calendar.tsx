"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAllDaysInMonth,
  isWeekend,
  toISODate,
  type MonthStats,
} from "@/lib/calendar";

type Props = {
  year: number;
  month: number;
  stats: MonthStats;
  inOfficeDates: Set<string>;
  onToggle: (iso: string) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthCalendar({
  year,
  month,
  stats,
  inOfficeDates,
  onToggle,
}: Props) {
  const days = getAllDaysInMonth(year, month);
  const holidayMap = new Map(stats.holidays.map((h) => [h.date, h.name]));

  const firstDay = new Date(year, month, 1).getDay();
  const leadingBlanks = (firstDay + 6) % 7;

  const today = toISODate(new Date());

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((date) => {
          const iso = toISODate(date);
          const weekend = isWeekend(date);
          const holidayName = holidayMap.get(iso);
          const isHoliday = Boolean(holidayName);
          const isInOffice = inOfficeDates.has(iso);
          const disabled = weekend || isHoliday;
          const isToday = iso === today;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(iso)}
              title={
                holidayName
                  ? holidayName
                  : weekend
                    ? "Weekend"
                    : isInOffice
                      ? "Click to remove"
                      : "Click to mark as in-office"
              }
              className={cn(
                "group relative aspect-square rounded-xl text-base flex flex-col items-center justify-center transition-all duration-150 p-1",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                weekend &&
                  "bg-slate-900/40 text-slate-500 cursor-not-allowed ring-1 ring-white/5",
                isHoliday &&
                  "bg-amber-500/15 text-amber-200 cursor-not-allowed ring-1 ring-amber-400/30",
                !disabled &&
                  !isInOffice &&
                  "bg-slate-800/70 text-slate-100 ring-1 ring-white/10 hover:bg-slate-800 hover:ring-white/20 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.5)]",
                isInOffice &&
                  !disabled &&
                  "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white ring-1 ring-emerald-300/40 shadow-[0_0_20px_-4px_rgba(52,211,153,0.5)] hover:shadow-[0_0_28px_-2px_rgba(52,211,153,0.7)] hover:-translate-y-0.5",
                isToday &&
                  !isInOffice &&
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
              {isInOffice && (
                <Check
                  className="absolute top-1 right-1 h-3 w-3 opacity-80"
                  strokeWidth={3}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
        <LegendSwatch
          className="bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_8px_-1px_rgba(52,211,153,0.6)]"
          label="In office"
        />
        <LegendSwatch className="bg-slate-800 ring-1 ring-white/10" label="Workable" />
        <LegendSwatch
          className="bg-amber-500/15 ring-1 ring-amber-400/30"
          label="Holiday"
        />
        <LegendSwatch
          className="bg-slate-900 ring-1 ring-white/5"
          label="Weekend"
        />
      </div>
    </div>
  );
}

function LegendSwatch({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-3 w-3 rounded-md", className)} />
      {label}
    </span>
  );
}
