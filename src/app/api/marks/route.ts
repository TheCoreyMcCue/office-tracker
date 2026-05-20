import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/session";
import { setDayMark, type DayMark } from "@/lib/repo";

const VALID_MARKS = new Set<DayMark>(["office", "pto", "sick"]);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PUT(req: Request) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    date?: string;
    mark?: DayMark | null;
  } | null;
  const date = body?.date;
  const mark = body?.mark ?? null;

  if (!date || !ISO_DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (mark !== null && !VALID_MARKS.has(mark)) {
    return NextResponse.json({ error: "Invalid mark" }, { status: 400 });
  }

  const data = await setDayMark(email, date, mark);
  return NextResponse.json({
    dates: {
      inOfficeDates: data.inOfficeDates,
      ptoDates: data.ptoDates,
      sickDates: data.sickDates,
    },
  });
}
