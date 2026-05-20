import { REPORTING_PERIODS_2026 } from "@/data/reporting-periods-2026";

export type ReportingPeriod = {
  label: string;
  start: string; // ISO YYYY-MM-DD (always a Monday)
  end: string; // ISO YYYY-MM-DD (always a Friday)
};

// As we add years, append the list (or import another file).
const ALL_PERIODS: ReportingPeriod[] = [...REPORTING_PERIODS_2026];

export function getAllReportingPeriods(): ReportingPeriod[] {
  return ALL_PERIODS;
}

// The key we use in URLs/storage — period start date (unique per period).
export function periodKey(p: ReportingPeriod): string {
  return p.start;
}

export function getPeriodByKey(key: string): ReportingPeriod | null {
  return ALL_PERIODS.find((p) => p.start === key) ?? null;
}

export function findPeriodForDate(date: Date): ReportingPeriod | null {
  const iso = toIso(date);
  return ALL_PERIODS.find((p) => iso >= p.start && iso <= p.end) ?? null;
}

export function getCurrentPeriod(now: Date = new Date()): ReportingPeriod {
  const found = findPeriodForDate(now);
  if (found) return found;
  // Between periods (weekend gap) or outside the year — fall back to the
  // closest preceding period, or the first period if we're earlier than all.
  const iso = toIso(now);
  for (let i = ALL_PERIODS.length - 1; i >= 0; i--) {
    if (ALL_PERIODS[i].start <= iso) return ALL_PERIODS[i];
  }
  return ALL_PERIODS[0];
}

export function getNextPeriod(p: ReportingPeriod): ReportingPeriod | null {
  const i = ALL_PERIODS.findIndex((x) => x.start === p.start);
  if (i < 0 || i === ALL_PERIODS.length - 1) return null;
  return ALL_PERIODS[i + 1];
}

export function getPreviousPeriod(
  p: ReportingPeriod,
): ReportingPeriod | null {
  const i = ALL_PERIODS.findIndex((x) => x.start === p.start);
  if (i <= 0) return null;
  return ALL_PERIODS[i - 1];
}

// All Mon–Fri dates between period.start and period.end inclusive.
export function getWeekdaysInPeriod(period: ReportingPeriod): Date[] {
  const out: Date[] = [];
  const start = parseIso(period.start);
  const end = parseIso(period.end);
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// Format the period's date range for display: "May 4 – May 29".
export function formatPeriodRange(period: ReportingPeriod): string {
  const start = parseIso(period.start);
  const end = parseIso(period.end);
  const startStr = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const endStr = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  return `${startStr} – ${endStr}`;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
