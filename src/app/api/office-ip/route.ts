import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/session";
import { getUserProfile, setOfficeIp } from "@/lib/repo";

export async function GET() {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const profile = await getUserProfile(email);
  return NextResponse.json({ officeIp: profile?.officeIp ?? null });
}

export async function PUT(req: Request) {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { ip?: string } | null;
  const ip = body?.ip?.trim();
  if (!ip) {
    return NextResponse.json({ error: "Missing ip" }, { status: 400 });
  }
  const profile = await setOfficeIp(email, ip);
  return NextResponse.json({ officeIp: profile.officeIp });
}
