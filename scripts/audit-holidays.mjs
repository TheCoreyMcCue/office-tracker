/* eslint-disable */
// Dumps every entry date-holidays returns for IE/NL for a given year,
// useful for sanity-checking against the canonical sources:
//   IE: https://www.citizensinformation.ie/en/employment/employment-rights-and-conditions/leave-and-holidays/public-holidays/
//   NL: https://www.rijksoverheid.nl/onderwerpen/schoolvakanties/wettelijke-feestdagen
//
// Run: node scripts/audit-holidays.mjs [year]

import Holidays from "date-holidays";

const year = Number.parseInt(process.argv[2] ?? "2026", 10);

for (const code of ["IE", "NL"]) {
  const hd = new Holidays(code);
  const list = hd.getHolidays(year) ?? [];
  console.log(`\n=== ${code} ${year} ===`);
  for (const h of list) {
    const d = new Date(h.date);
    const dow = d.toLocaleDateString("en-GB", { weekday: "short" });
    console.log(
      `${h.date.slice(0, 10)}  ${dow}  ${(h.type ?? "").padEnd(10)}  ${h.name}`,
    );
  }
}
