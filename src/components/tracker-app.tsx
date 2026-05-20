"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import {
  SUPPORTED_COUNTRIES,
  type CountryCode,
  type PeriodStats,
} from "@/lib/calendar";
import {
  formatPeriodRange,
  periodKey,
  type ReportingPeriod,
  getAllReportingPeriods,
} from "@/lib/reporting-periods";
import type { DayMark, UserProfile } from "@/lib/repo";
import { cn } from "@/lib/utils";
import { PeriodCalendar } from "./period-calendar";
import { SummaryCard } from "./summary-card";

export type UserDates = {
  inOfficeDates: string[];
  ptoDates: string[];
  sickDates: string[];
};

type Props = {
  initialProfile: UserProfile;
  initialPeriod: ReportingPeriod;
  initialDates: UserDates;
  initialStats: PeriodStats;
};

const MODES: {
  mark: DayMark;
  label: string;
  dotClass: string;
  activeClass: string;
}[] = [
  {
    mark: "office",
    label: "Office",
    dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
    activeClass:
      "bg-emerald-500/20 text-white ring-1 ring-emerald-400/50 shadow-[0_0_16px_-4px_rgba(52,211,153,0.55)]",
  },
  {
    mark: "pto",
    label: "PTO",
    dotClass: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]",
    activeClass:
      "bg-sky-500/20 text-white ring-1 ring-sky-400/50 shadow-[0_0_16px_-4px_rgba(56,189,248,0.55)]",
  },
  {
    mark: "sick",
    label: "Sick",
    dotClass: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]",
    activeClass:
      "bg-rose-500/20 text-white ring-1 ring-rose-400/50 shadow-[0_0_16px_-4px_rgba(251,113,133,0.55)]",
  },
];

export function TrackerApp({
  initialProfile,
  initialPeriod,
  initialDates,
  initialStats,
}: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [period, setPeriod] = useState<ReportingPeriod>(initialPeriod);
  const [dates, setDates] = useState<UserDates>(initialDates);
  const [stats, setStats] = useState<PeriodStats>(initialStats);
  const [mode, setMode] = useState<DayMark>("office");
  const [isPending, startTransition] = useTransition();

  const allPeriods = getAllReportingPeriods();
  const periodIndex = allPeriods.findIndex((p) => p.start === period.start);
  const hasPrev = periodIndex > 0;
  const hasNext = periodIndex >= 0 && periodIndex < allPeriods.length - 1;

  const loadPeriod = useCallback(async (next: ReportingPeriod) => {
    const res = await fetch(`/api/periods/${periodKey(next)}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      profile: UserProfile;
      dates: UserDates;
      stats: PeriodStats;
    };
    setProfile(data.profile);
    setDates(data.dates);
    setStats(data.stats);
    setPeriod(next);
  }, []);

  const shiftPeriod = useCallback(
    (delta: -1 | 1) => {
      const target = allPeriods[periodIndex + delta];
      if (!target) return;
      startTransition(() => {
        void loadPeriod(target);
      });
    },
    [allPeriods, periodIndex, loadPeriod],
  );

  const updateCountry = useCallback(
    async (next: CountryCode) => {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ country: next }),
      });
      if (!res.ok) return;
      const updated = (await res.json()) as { profile: UserProfile };
      setProfile(updated.profile);
      await loadPeriod(period);
    },
    [period, loadPeriod],
  );

  const toggleDate = useCallback(
    (date: string) => {
      const current: DayMark | null = dates.inOfficeDates.includes(date)
        ? "office"
        : dates.ptoDates.includes(date)
          ? "pto"
          : dates.sickDates.includes(date)
            ? "sick"
            : null;
      const nextMark: DayMark | null = current === mode ? null : mode;

      // Optimistic update.
      const filter = (arr: string[]) => arr.filter((d) => d !== date);
      const nextDates: UserDates = {
        inOfficeDates: filter(dates.inOfficeDates),
        ptoDates: filter(dates.ptoDates),
        sickDates: filter(dates.sickDates),
      };
      if (nextMark === "office")
        nextDates.inOfficeDates = [...nextDates.inOfficeDates, date].sort();
      else if (nextMark === "pto")
        nextDates.ptoDates = [...nextDates.ptoDates, date].sort();
      else if (nextMark === "sick")
        nextDates.sickDates = [...nextDates.sickDates, date].sort();
      setDates(nextDates);

      startTransition(async () => {
        const res = await fetch("/api/marks", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ date, mark: nextMark }),
        });
        if (!res.ok) return;
        const body = (await res.json()) as { dates: UserDates };
        setDates(body.dates);
        // Refresh stats from the server for the current period.
        const statsRes = await fetch(`/api/periods/${periodKey(period)}`);
        if (!statsRes.ok) return;
        const refreshed = (await statsRes.json()) as { stats: PeriodStats };
        setStats(refreshed.stats);
      });
    },
    [dates, mode, period],
  );

  async function signOut() {
    await fetch("/api/session", { method: "DELETE" });
    router.refresh();
  }

  const countryName =
    SUPPORTED_COUNTRIES.find((c) => c.code === profile.country)?.name ??
    profile.country;

  const panelClass =
    "relative rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] p-5";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-[0_0_24px_-4px_rgba(99,102,241,0.6)] ring-1 ring-white/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Office Tracker
            </h1>
            <p className="text-sm text-slate-300">{profile.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={profile.country}
            onValueChange={(v) => updateCountry(v as CountryCode)}
          >
            <SelectTrigger
              id="country"
              className="w-[150px] bg-slate-900/70 backdrop-blur border-0 ring-1 ring-white/15 text-white text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-slate-200 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 backdrop-blur p-1 ring-1 ring-white/10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => shiftPeriod(-1)}
            aria-label="Previous period"
            disabled={isPending || !hasPrev}
            className="rounded-full h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-2 text-center min-w-[180px]">
            <div className="text-base font-semibold text-white tabular-nums tracking-tight leading-tight">
              {period.label}
            </div>
            <div className="text-xs text-slate-400 tabular-nums">
              {formatPeriodRange(period)}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => shiftPeriod(1)}
            aria-label="Next period"
            disabled={isPending || !hasNext}
            className="rounded-full h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {isPending && (
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/40">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-300 animate-pulse" />
            Saving
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div
          className={cn(
            panelClass,
            "flex flex-col lg:min-h-[calc(100dvh-220px)]",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Calendar
            </div>
            <h2 className="text-lg font-semibold text-white mt-1">
              Mark your days
            </h2>
            <p className="text-sm text-slate-300 mb-3">
              Pick what you&apos;re marking below, then click a day. Click
              again to clear.
            </p>
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-950/40 p-2 ring-1 ring-white/10">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 pl-2">
                Marking as
              </span>
              <div className="inline-flex items-center gap-1 flex-1 min-w-0">
                {MODES.map((m) => (
                  <button
                    key={m.mark}
                    type="button"
                    onClick={() => setMode(m.mark)}
                    aria-pressed={mode === m.mark}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                      mode === m.mark
                        ? m.activeClass
                        : "text-slate-300 hover:text-white hover:bg-white/5 ring-1 ring-transparent",
                    )}
                  >
                    <span
                      className={cn("h-2 w-2 rounded-full", m.dotClass)}
                    />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <PeriodCalendar
            period={period}
            stats={stats}
            dates={dates}
            mode={mode}
            onToggle={toggleDate}
          />
        </div>

        <div className="space-y-4">
          <SummaryCard stats={stats} />

          {stats.holidays.length > 0 && (
            <div className={panelClass}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Public holidays
                  </div>
                  <div className="text-sm text-slate-300 mt-1">
                    {countryName}
                  </div>
                </div>
                <Sparkles className="h-5 w-5 text-amber-400" />
              </div>
              <ul className="space-y-3">
                {stats.holidays.map((h) => (
                  <li
                    key={h.date}
                    className="flex justify-between items-baseline gap-4"
                  >
                    <span className="text-base text-white font-medium">
                      {h.name}
                    </span>
                    <span className="text-sm text-slate-400 tabular-nums">
                      {new Date(h.date).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
