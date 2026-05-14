import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/session";
import {
  getMonthRecord,
  getUserProfile,
  setInOfficeDates,
  setPtoDays,
  setSickDays,
} from "@/lib/repo";
import { computeMonthStats, parseMonthKey } from "@/lib/calendar";

function isValidMonthKey(key: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(key);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ monthKey: string }> },
) {
  const { monthKey } = await params;
  if (!isValidMonthKey(monthKey)) {
    return NextResponse.json({ error: "Bad month key" }, { status: 400 });
  }
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Profile missing" }, { status: 404 });
  }
  const record = await getMonthRecord(email, monthKey);
  const { year, month } = parseMonthKey(monthKey);
  const stats = computeMonthStats({
    year,
    month,
    country: profile.country,
    ptoDays: record?.ptoDays ?? 0,
    sickDays: record?.sickDays ?? 0,
    inOfficeDates: record?.inOfficeDates ?? [],
  });
  return NextResponse.json({
    profile,
    record: record ?? {
      email,
      monthKey,
      ptoDays: 0,
      sickDays: 0,
      inOfficeDates: [],
      updatedAt: null,
    },
    stats,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ monthKey: string }> },
) {
  const { monthKey } = await params;
  if (!isValidMonthKey(monthKey)) {
    return NextResponse.json({ error: "Bad month key" }, { status: 400 });
  }
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    return NextResponse.json({ error: "Profile missing" }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as {
    ptoDays?: number;
    sickDays?: number;
    inOfficeDates?: string[];
  } | null;

  let record = await getMonthRecord(email, monthKey);
  if (typeof body?.ptoDays === "number") {
    record = await setPtoDays(email, monthKey, body.ptoDays);
  }
  if (typeof body?.sickDays === "number") {
    record = await setSickDays(email, monthKey, body.sickDays);
  }
  if (Array.isArray(body?.inOfficeDates)) {
    record = await setInOfficeDates(email, monthKey, body.inOfficeDates);
  }

  const { year, month } = parseMonthKey(monthKey);
  const stats = computeMonthStats({
    year,
    month,
    country: profile.country,
    ptoDays: record?.ptoDays ?? 0,
    sickDays: record?.sickDays ?? 0,
    inOfficeDates: record?.inOfficeDates ?? [],
  });
  return NextResponse.json({ profile, record, stats });
}
