import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidEmail, SESSION_COOKIE } from "@/lib/session";
import { getUserProfile, upsertUserProfile } from "@/lib/repo";
import type { CountryCode } from "@/lib/calendar";
import { SUPPORTED_COUNTRIES } from "@/lib/calendar";

const SUPPORTED_CODES = new Set(SUPPORTED_COUNTRIES.map((c) => c.code));

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    country?: string;
  } | null;

  const email = body?.email?.trim().toLowerCase();
  const country = body?.country as CountryCode | undefined;

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }

  const existing = await getUserProfile(email);
  const resolvedCountry = country && SUPPORTED_CODES.has(country)
    ? country
    : existing?.country ?? "IE";

  const profile = await upsertUserProfile(email, resolvedCountry);

  const store = await cookies();
  store.set(SESSION_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ profile });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
