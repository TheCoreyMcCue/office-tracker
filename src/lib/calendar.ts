import Holidays from "date-holidays";

export type CountryCode = "IE" | "NL";

export const SUPPORTED_COUNTRIES: { code: CountryCode; name: string }[] = [
  { code: "IE", name: "Ireland" },
  { code: "NL", name: "Netherlands" },
];

export const OFFICE_TARGET_RATIO = 0.6;

const holidaysCache = new Map<string, Holidays>();

function getHolidays(country: CountryCode): Holidays {
  let h = holidaysCache.get(country);
  if (!h) {
    h = new Holidays(country);
    holidaysCache.set(country, h);
  }
  return h;
}

export function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getWeekdaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    if (!isWeekend(date)) days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function getAllDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export type HolidayInfo = { date: string; name: string };

const EXTRA_HOLIDAYS: Record<CountryCode, (year: number) => HolidayInfo[]> = {
  IE: () => [],
  NL: (year) => [{ date: `${year}-05-05`, name: "Liberation Day" }],
};

export function getPublicHolidaysInMonth(
  country: CountryCode,
  year: number,
  month: number,
): HolidayInfo[] {
  const hd = getHolidays(country);
  const all = hd.getHolidays(year) ?? [];
  const result: HolidayInfo[] = [];
  const seen = new Set<string>();

  const push = (date: string, name: string) => {
    const d = new Date(date);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    if (isWeekend(d)) return;
    const iso = toISODate(d);
    if (seen.has(iso)) return;
    seen.add(iso);
    result.push({ date: iso, name });
  };

  for (const h of all) {
    if (h.type !== "public") continue;
    push(h.date, h.name);
  }
  for (const extra of EXTRA_HOLIDAYS[country](year)) {
    push(extra.date, extra.name);
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export type MonthStats = {
  year: number;
  month: number;
  country: CountryCode;
  totalWeekdays: number;
  holidays: HolidayInfo[];
  ptoDays: number;
  workableDays: number;
  targetDays: number;
  inOfficeCount: number;
  remainingToTarget: number;
  percentageAchieved: number;
  onTrack: boolean;
};

export function computeMonthStats(args: {
  year: number;
  month: number;
  country: CountryCode;
  ptoDays: number;
  inOfficeDates: string[];
}): MonthStats {
  const { year, month, country, ptoDays, inOfficeDates } = args;
  const weekdays = getWeekdaysInMonth(year, month);
  const holidays = getPublicHolidaysInMonth(country, year, month);
  const totalWeekdays = weekdays.length;

  const holidaySet = new Set(holidays.map((h) => h.date));
  const cappedPto = Math.max(
    0,
    Math.min(ptoDays, totalWeekdays - holidays.length),
  );

  const workableDays = totalWeekdays - holidays.length - cappedPto;
  const targetDays =
    workableDays > 0 ? Math.ceil(workableDays * OFFICE_TARGET_RATIO) : 0;

  const validInOffice = inOfficeDates.filter((iso) => {
    const d = new Date(iso);
    return (
      !Number.isNaN(d.getTime()) &&
      d.getFullYear() === year &&
      d.getMonth() === month &&
      !isWeekend(d) &&
      !holidaySet.has(iso)
    );
  });
  const inOfficeCount = new Set(validInOffice).size;

  const remainingToTarget = Math.max(0, targetDays - inOfficeCount);
  const percentageAchieved =
    workableDays > 0 ? inOfficeCount / workableDays : 0;

  return {
    year,
    month,
    country,
    totalWeekdays,
    holidays,
    ptoDays: cappedPto,
    workableDays,
    targetDays,
    inOfficeCount,
    remainingToTarget,
    percentageAchieved,
    onTrack: inOfficeCount >= targetDays,
  };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m - 1 };
}

export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}
