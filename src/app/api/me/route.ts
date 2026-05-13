import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/session";
import { getUserProfile, upsertUserProfile } from "@/lib/repo";
import { SUPPORTED_COUNTRIES, type CountryCode } from "@/lib/calendar";

const SUPPORTED_CODES = new Set(SUPPORTED_COUNTRIES.map((c) => c.code));

export async function GET() {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ profile: null }, { status: 200 });
  }
  const profile = await getUserProfile(email);
  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    country?: string;
  } | null;
  const country = body?.country as CountryCode | undefined;
  if (!country || !SUPPORTED_CODES.has(country)) {
    return NextResponse.json(
      { error: "Unsupported country" },
      { status: 400 },
    );
  }
  const profile = await upsertUserProfile(email, country);
  return NextResponse.json({ profile });
}
