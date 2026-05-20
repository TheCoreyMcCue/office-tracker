import type { ReportingPeriod } from "@/lib/reporting-periods";

// Source: company HR portal, 2026 Attendance Report periods.
// Each period is a contiguous Mon–Fri block; gaps between periods are
// always the intervening weekend, so every weekday belongs to exactly
// one reporting period.
export const REPORTING_PERIODS_2026: ReportingPeriod[] = [
  { label: "January 2026", start: "2026-01-05", end: "2026-01-30" },
  { label: "February 2026", start: "2026-02-02", end: "2026-02-27" },
  { label: "March 2026", start: "2026-03-02", end: "2026-03-27" },
  { label: "April 2026", start: "2026-03-30", end: "2026-05-01" },
  { label: "May 2026", start: "2026-05-04", end: "2026-05-29" },
  { label: "June 2026", start: "2026-06-01", end: "2026-06-26" },
  { label: "July 2026", start: "2026-06-29", end: "2026-07-31" },
  { label: "August 2026", start: "2026-08-03", end: "2026-08-28" },
  { label: "September 2026", start: "2026-08-31", end: "2026-10-02" },
  { label: "October 2026", start: "2026-10-05", end: "2026-10-30" },
  { label: "November 2026", start: "2026-11-02", end: "2026-11-27" },
  { label: "December 2026", start: "2026-11-30", end: "2027-01-01" },
];
