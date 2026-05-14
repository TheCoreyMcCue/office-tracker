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

// Holidays we treat as public even though date-holidays returns them with a
// non-"public" type. Each entry carries a `note` explaining the discrepancy
// so future maintainers don't have to re-derive the reasoning.
// Sources:
//   NL — https://www.government.nl/topics/public-holidays
//   IE — https://www.fssu.ie/post-primary/topics/payroll/public-holidays/
type AdditionalHoliday = {
  // Lowercased name to match against date-holidays' output.
  name: string;
  // Why we override date-holidays' classification.
  note: string;
};
const ADDITIONAL_PUBLIC_HOLIDAYS: Record<CountryCode, AdditionalHoliday[]> = {
  // Ireland's statutory public holidays are all returned as type="public" by
  // date-holidays, so nothing to add here. Weekend-fall substitutes are
  // handled separately — see the isSubstitute check below.
  IE: [],
  NL: [
    {
      name: "goede vrijdag",
      note: "Listed on government.nl as a public holiday, but date-holidays returns type='school' because NL law leaves whether it's a paid day off to each CAO.",
    },
    {
      name: "bevrijdingsdag",
      note: "Listed on government.nl as a public holiday. date-holidays returns type='public' only on 5-yearly liberation anniversaries (1945+5n); in all other years it's type='school'.",
    },
  ],
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

  const additional = ADDITIONAL_PUBLIC_HOLIDAYS[country];
  for (const h of all) {
    const lowerName = h.name.toLowerCase();
    const isPublic = h.type === "public";
    const isAdditional = additional.some((a) => lowerName === a.name);
    // Substitute days: when an IE public holiday lands on Sat/Sun, the
    // statute (per FSSU) does NOT grant an automatic next-working-day off —
    // employers compensate via TOIL, extra pay, or an alternative day at
    // their discretion. In practice most Irish employers give the next
    // Monday, so we include date-holidays' "(substitute day)" entries.
    // This branch is a no-op in years where no IE public holiday falls on
    // a weekend (e.g. 2025: none; 2026: Dec 26 Sat → Dec 28 Mon; 2027: Dec
    // 25 Sat → Dec 27 Mon).
    const isSubstitute = lowerName.includes("substitute");
    if (!isPublic && !isAdditional && !isSubstitute) continue;
    push(h.date, h.name);
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
  sickDays: number;
  workableDays: number;
  targetDays: number;
  inOfficeCount: number;
  remainingToTarget: number;
  percentageAchieved: number;
  onTrack: boolean;
  // Days the user could still physically be in the office this month:
  // weekdays from today (inclusive) through month-end, minus future
  // holidays, minus all PTO and sick days (conservative — assumes none
  // have been "used" in the past).
  workingDaysLeft: number;
};

export function computeMonthStats(args: {
  year: number;
  month: number;
  country: CountryCode;
  ptoDays: number;
  sickDays: number;
  inOfficeDates: string[];
}): MonthStats {
  const { year, month, country, ptoDays, sickDays, inOfficeDates } = args;
  const weekdays = getWeekdaysInMonth(year, month);
  const holidays = getPublicHolidaysInMonth(country, year, month);
  const totalWeekdays = weekdays.length;

  const holidaySet = new Set(holidays.map((h) => h.date));
  const availableForOff = Math.max(0, totalWeekdays - holidays.length);
  const cappedPto = Math.max(0, Math.min(ptoDays, availableForOff));
  const cappedSick = Math.max(0, Math.min(sickDays, availableForOff));

  const workableDays = Math.max(
    0,
    totalWeekdays - holidays.length - cappedPto - cappedSick,
  );
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

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const weekdaysRemaining = weekdays.filter(
    (d) => d >= startOfToday && !holidaySet.has(toISODate(d)),
  ).length;
  const workingDaysLeft = Math.max(
    0,
    weekdaysRemaining - cappedPto - cappedSick,
  );

  return {
    year,
    month,
    country,
    totalWeekdays,
    holidays,
    ptoDays: cappedPto,
    sickDays: cappedSick,
    workableDays,
    targetDays,
    inOfficeCount,
    remainingToTarget,
    percentageAchieved,
    onTrack: inOfficeCount >= targetDays,
    workingDaysLeft,
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
