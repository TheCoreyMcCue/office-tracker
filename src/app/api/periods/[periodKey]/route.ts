import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/session";
import { getUserData } from "@/lib/repo";
import { computePeriodStats } from "@/lib/calendar";
import { getPeriodByKey } from "@/lib/reporting-periods";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ periodKey: string }> },
) {
  const { periodKey } = await params;
  const period = getPeriodByKey(periodKey);
  if (!period) {
    return NextResponse.json({ error: "Unknown period" }, { status: 404 });
  }
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const data = await getUserData(email);
  if (!data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const stats = computePeriodStats({
    period,
    country: data.profile.country,
    inOfficeDates: data.inOfficeDates,
    ptoDates: data.ptoDates,
    sickDates: data.sickDates,
  });
  return NextResponse.json({
    profile: data.profile,
    dates: {
      inOfficeDates: data.inOfficeDates,
      ptoDates: data.ptoDates,
      sickDates: data.sickDates,
    },
    stats,
  });
}
