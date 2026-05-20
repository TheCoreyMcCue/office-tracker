import Holidays from "date-holidays";
import type { ReportingPeriod } from "./reporting-periods";
import { getWeekdaysInPeriod } from "./reporting-periods";

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

export type HolidayInfo = { date: string; name: string };

// Holidays we treat as public even though date-holidays returns them with a
// non-"public" type. Each entry carries a `note` explaining the discrepancy
// so future maintainers don't have to re-derive the reasoning.
// Sources:
//   NL — https://www.government.nl/topics/public-holidays
//   IE — https://www.fssu.ie/post-primary/topics/payroll/public-holidays/
type AdditionalHoliday = {
  name: string;
  note: string;
};
const ADDITIONAL_PUBLIC_HOLIDAYS: Record<CountryCode, AdditionalHoliday[]> = {
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

// Holidays in [startIso, endIso] inclusive, weekdays only, deduped.
export function getPublicHolidaysInRange(
  country: CountryCode,
  startIso: string,
  endIso: string,
): HolidayInfo[] {
  const hd = getHolidays(country);
  const startYear = Number(startIso.slice(0, 4));
  const endYear = Number(endIso.slice(0, 4));
  const years = new Set<number>();
  for (let y = startYear; y <= endYear; y++) years.add(y);

  const result: HolidayInfo[] = [];
  const seen = new Set<string>();

  const push = (date: string, name: string) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return;
    if (isWeekend(d)) return;
    const iso = toISODate(d);
    if (iso < startIso || iso > endIso) return;
    if (seen.has(iso)) return;
    seen.add(iso);
    result.push({ date: iso, name });
  };

  const additional = ADDITIONAL_PUBLIC_HOLIDAYS[country];
  for (const year of years) {
    const all = hd.getHolidays(year) ?? [];
    for (const h of all) {
      const lowerName = h.name.toLowerCase();
      const isPublic = h.type === "public";
      const isAdditional = additional.some((a) => lowerName === a.name);
      // Substitute days: see FSSU note in earlier commit. Includes
      // date-holidays' "(substitute day)" entries since most IE employers
      // observe them in practice.
      const isSubstitute = lowerName.includes("substitute");
      if (!isPublic && !isAdditional && !isSubstitute) continue;
      push(h.date, h.name);
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export type PeriodStats = {
  period: ReportingPeriod;
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
  // Max remaining capacity: weekdays in this period from today (inclusive)
  // onward, minus future holidays. PTO/sick are intentionally NOT subtracted
  // here — they already reduce the target via workableDays, and subtracting
  // again would falsely shrink the buffer.
  workingDaysLeft: number;
};

export function computePeriodStats(args: {
  period: ReportingPeriod;
  country: CountryCode;
  inOfficeDates: string[];
  ptoDates: string[];
  sickDates: string[];
}): PeriodStats {
  const { period, country, inOfficeDates, ptoDates, sickDates } = args;
  const weekdays = getWeekdaysInPeriod(period);
  const holidays = getPublicHolidaysInRange(country, period.start, period.end);
  const totalWeekdays = weekdays.length;

  const holidaySet = new Set(holidays.map((h) => h.date));
  const inRange = (iso: string) => iso >= period.start && iso <= period.end;

  const ptoInPeriod = new Set(
    ptoDates.filter((d) => inRange(d) && !holidaySet.has(d)),
  );
  const sickInPeriod = new Set(
    sickDates.filter(
      (d) => inRange(d) && !holidaySet.has(d) && !ptoInPeriod.has(d),
    ),
  );
  const officeInPeriod = new Set(
    inOfficeDates.filter(
      (d) =>
        inRange(d) &&
        !holidaySet.has(d) &&
        !ptoInPeriod.has(d) &&
        !sickInPeriod.has(d),
    ),
  );

  const workableDays = Math.max(
    0,
    totalWeekdays - holidays.length - ptoInPeriod.size - sickInPeriod.size,
  );
  const targetDays =
    workableDays > 0 ? Math.ceil(workableDays * OFFICE_TARGET_RATIO) : 0;

  const inOfficeCount = officeInPeriod.size;
  const remainingToTarget = Math.max(0, targetDays - inOfficeCount);
  const percentageAchieved =
    workableDays > 0 ? inOfficeCount / workableDays : 0;

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const workingDaysLeft = weekdays.filter(
    (d) => d >= startOfToday && !holidaySet.has(toISODate(d)),
  ).length;

  return {
    period,
    country,
    totalWeekdays,
    holidays,
    ptoDays: ptoInPeriod.size,
    sickDays: sickInPeriod.size,
    workableDays,
    targetDays,
    inOfficeCount,
    remainingToTarget,
    percentageAchieved,
    onTrack: inOfficeCount >= targetDays,
    workingDaysLeft,
  };
}
