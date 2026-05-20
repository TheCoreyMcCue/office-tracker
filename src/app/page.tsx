import { getSessionEmail } from "@/lib/session";
import { getUserData } from "@/lib/repo";
import { computePeriodStats } from "@/lib/calendar";
import { getCurrentPeriod } from "@/lib/reporting-periods";
import { SignInForm } from "@/components/sign-in-form";
import { TrackerApp } from "@/components/tracker-app";

export default async function Home() {
  const email = await getSessionEmail();
  const data = email ? await getUserData(email) : null;

  if (!data) {
    return (
      <main className="relative flex-1 flex items-center justify-center px-6 py-12 bg-slate-950 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(99,102,241,0.18),transparent_70%)]"
        />
        <div className="relative z-10">
          <SignInForm />
        </div>
      </main>
    );
  }

  const period = getCurrentPeriod();
  const stats = computePeriodStats({
    period,
    country: data.profile.country,
    inOfficeDates: data.inOfficeDates,
    ptoDates: data.ptoDates,
    sickDates: data.sickDates,
  });

  return (
    <main className="relative flex-1 px-6 py-5 bg-slate-950 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(99,102,241,0.18),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(circle_at_85%_120%,rgba(16,185,129,0.08),transparent_50%)]"
      />
      <div className="relative z-10">
        <TrackerApp
          initialProfile={data.profile}
          initialPeriod={period}
          initialDates={{
            inOfficeDates: data.inOfficeDates,
            ptoDates: data.ptoDates,
            sickDates: data.sickDates,
          }}
          initialStats={stats}
        />
      </div>
    </main>
  );
}
