"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import {
  SUPPORTED_COUNTRIES,
  formatMonthLabel,
  monthKey as buildMonthKey,
  parseMonthKey,
  type CountryCode,
  type MonthStats,
} from "@/lib/calendar";
import type { MonthRecord, UserProfile } from "@/lib/repo";
import { MonthCalendar } from "./month-calendar";
import { SummaryCard } from "./summary-card";

type Props = {
  initialProfile: UserProfile;
  initialMonthKey: string;
  initialRecord: MonthRecord;
  initialStats: MonthStats;
};

export function TrackerApp({
  initialProfile,
  initialMonthKey,
  initialRecord,
  initialStats,
}: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [record, setRecord] = useState<MonthRecord>(initialRecord);
  const [stats, setStats] = useState<MonthStats>(initialStats);
  const [ptoInput, setPtoInput] = useState<string>(
    String(initialRecord.ptoDays ?? 0),
  );
  const [isPending, startTransition] = useTransition();

  const { year, month } = useMemo(() => parseMonthKey(monthKey), [monthKey]);

  const loadMonth = useCallback(
    async (nextKey: string) => {
      const res = await fetch(`/api/months/${nextKey}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        profile: UserProfile;
        record: MonthRecord;
        stats: MonthStats;
      };
      setProfile(data.profile);
      setRecord(data.record);
      setStats(data.stats);
      setPtoInput(String(data.record.ptoDays ?? 0));
      setMonthKey(nextKey);
    },
    [],
  );

  const shiftMonth = useCallback(
    (delta: number) => {
      const d = new Date(year, month + delta, 1);
      const nextKey = buildMonthKey(d.getFullYear(), d.getMonth());
      startTransition(() => {
        void loadMonth(nextKey);
      });
    },
    [year, month, loadMonth],
  );

  const updateCountry = useCallback(
    async (next: CountryCode) => {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ country: next }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { profile: UserProfile };
      setProfile(data.profile);
      await loadMonth(monthKey);
    },
    [monthKey, loadMonth],
  );

  const persistMonth = useCallback(
    async (body: { ptoDays?: number; inOfficeDates?: string[] }) => {
      const res = await fetch(`/api/months/${monthKey}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        profile: UserProfile;
        record: MonthRecord;
        stats: MonthStats;
      };
      setProfile(data.profile);
      setRecord(data.record);
      setStats(data.stats);
      setPtoInput(String(data.record.ptoDays ?? 0));
    },
    [monthKey],
  );

  const toggleInOffice = useCallback(
    (iso: string) => {
      const current = new Set(record.inOfficeDates);
      if (current.has(iso)) current.delete(iso);
      else current.add(iso);
      const next = Array.from(current).sort();
      startTransition(() => {
        void persistMonth({ inOfficeDates: next });
      });
    },
    [record.inOfficeDates, persistMonth],
  );

  const commitPto = useCallback(() => {
    const parsed = Number.parseInt(ptoInput, 10);
    const safe = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    startTransition(() => {
      void persistMonth({ ptoDays: safe });
    });
  }, [ptoInput, persistMonth]);

  async function signOut() {
    await fetch("/api/session", { method: "DELETE" });
    router.refresh();
  }

  const countryName =
    SUPPORTED_COUNTRIES.find((c) => c.code === profile.country)?.name ??
    profile.country;

  const panelClass =
    "relative rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] p-6";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
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
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            disabled={isPending}
            className="rounded-full h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-base font-semibold text-white min-w-[150px] text-center tabular-nums tracking-tight">
            {formatMonthLabel(year, month)}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            disabled={isPending}
            className="rounded-full h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10"
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

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className={panelClass}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
          <div className="mb-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Calendar
            </div>
            <h2 className="text-lg font-semibold text-white mt-1.5">
              Mark in-office days
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Click any weekday to toggle. Weekends and holidays are excluded.
            </p>
          </div>
          <MonthCalendar
            year={year}
            month={month}
            stats={stats}
            inOfficeDates={new Set(record.inOfficeDates)}
            onToggle={toggleInOffice}
          />
        </div>

        <div className="space-y-6">
          <SummaryCard stats={stats} />

          <div className={panelClass}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  PTO this month
                </div>
                <div className="text-sm text-slate-300 mt-1">
                  Taken or planned
                </div>
              </div>
              <CalendarDays className="h-5 w-5 text-slate-400" />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={1}
                value={ptoInput}
                onChange={(e) => setPtoInput(e.target.value)}
                onBlur={commitPto}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitPto();
                  }
                }}
                className="max-w-[120px] bg-slate-950/60 ring-1 ring-white/10 border-0 text-lg font-semibold tabular-nums text-white h-11 focus-visible:ring-indigo-400/60 focus-visible:ring-2"
              />
              <Button
                variant="outline"
                onClick={commitPto}
                disabled={isPending}
                className="h-11 bg-white/5 border-0 ring-1 ring-white/15 text-white hover:bg-white/10"
              >
                Save
              </Button>
            </div>
          </div>

          {stats.holidays.length > 0 && (
            <div className={panelClass}>
              <div className="flex items-center justify-between mb-4">
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
