import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, PK_ATTR, TABLE_NAME, userKey } from "./db";
import type { CountryCode } from "./calendar";

export type DayMark = "office" | "pto" | "sick";

export type UserProfile = {
  email: string;
  country: CountryCode;
  createdAt: string;
};

export type UserData = {
  profile: UserProfile;
  inOfficeDates: string[];
  ptoDates: string[];
  sickDates: string[];
};

type StoredMonth = {
  inOfficeDates?: string[];
};

type StoredUserItem = {
  [PK_ATTR]?: string;
  email?: string;
  country?: CountryCode;
  createdAt?: string;
  // New global arrays.
  inOfficeDates?: string[];
  ptoDates?: string[];
  sickDates?: string[];
  // Legacy per-month structure. inOfficeDates inside are flattened on read
  // into the top-level inOfficeDates array. PTO/sick counts here are NOT
  // migrated (we have no date info to recover from a count) and are ignored.
  months?: Record<string, StoredMonth>;
};

async function getUserItem(email: string): Promise<StoredUserItem | null> {
  const res = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: userKey(email) }),
  );
  return (res.Item as StoredUserItem | undefined) ?? null;
}

function toProfile(item: StoredUserItem): UserProfile | null {
  if (!item.email || !item.country) return null;
  return {
    email: item.email,
    country: item.country,
    createdAt: item.createdAt ?? new Date(0).toISOString(),
  };
}

function dedupeAndSort(dates: string[] | undefined): string[] {
  return Array.from(new Set(dates ?? [])).sort();
}

function flattenLegacyInOfficeDates(item: StoredUserItem): string[] {
  if (!item.months) return [];
  const out: string[] = [];
  for (const month of Object.values(item.months)) {
    if (month?.inOfficeDates) out.push(...month.inOfficeDates);
  }
  return out;
}

function toUserData(item: StoredUserItem): UserData | null {
  const profile = toProfile(item);
  if (!profile) return null;
  // Prefer top-level fields when present, fall back to legacy months map.
  const inOffice = dedupeAndSort([
    ...(item.inOfficeDates ?? []),
    ...flattenLegacyInOfficeDates(item),
  ]);
  return {
    profile,
    inOfficeDates: inOffice,
    ptoDates: dedupeAndSort(item.ptoDates),
    sickDates: dedupeAndSort(item.sickDates),
  };
}

export async function getUserProfile(
  email: string,
): Promise<UserProfile | null> {
  const item = await getUserItem(email);
  if (!item) return null;
  return toProfile(item);
}

export async function getUserData(email: string): Promise<UserData | null> {
  const item = await getUserItem(email);
  if (!item) return null;
  return toUserData(item);
}

export async function upsertUserProfile(
  email: string,
  country: CountryCode,
): Promise<UserProfile> {
  const normalizedEmail = email.toLowerCase();
  const now = new Date().toISOString();
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: userKey(normalizedEmail),
      UpdateExpression:
        "SET #email = :email, #country = :country, #createdAt = if_not_exists(#createdAt, :now), #inOffice = if_not_exists(#inOffice, :empty), #pto = if_not_exists(#pto, :empty), #sick = if_not_exists(#sick, :empty)",
      ExpressionAttributeNames: {
        "#email": "email",
        "#country": "country",
        "#createdAt": "createdAt",
        "#inOffice": "inOfficeDates",
        "#pto": "ptoDates",
        "#sick": "sickDates",
      },
      ExpressionAttributeValues: {
        ":email": normalizedEmail,
        ":country": country,
        ":now": now,
        ":empty": [],
      },
    }),
  );
  const item = await getUserItem(normalizedEmail);
  if (!item) throw new Error("User item missing after upsert");
  const profile = toProfile(item);
  if (!profile) throw new Error("User item malformed after upsert");
  return profile;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function setDayMark(
  email: string,
  date: string,
  mark: DayMark | null,
): Promise<UserData> {
  if (!ISO_DATE_RE.test(date)) {
    throw new Error(`Invalid date: ${date}`);
  }
  const normalizedEmail = email.toLowerCase();
  const data = await getUserData(normalizedEmail);
  if (!data) throw new Error("User not found");

  // Remove this date from all three arrays, then add it to the target (if any).
  const next: Record<DayMark, string[]> = {
    office: data.inOfficeDates.filter((d) => d !== date),
    pto: data.ptoDates.filter((d) => d !== date),
    sick: data.sickDates.filter((d) => d !== date),
  };
  if (mark) {
    next[mark] = dedupeAndSort([...next[mark], date]);
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: userKey(normalizedEmail),
      UpdateExpression:
        "SET #inOffice = :inOffice, #pto = :pto, #sick = :sick",
      ExpressionAttributeNames: {
        "#inOffice": "inOfficeDates",
        "#pto": "ptoDates",
        "#sick": "sickDates",
      },
      ExpressionAttributeValues: {
        ":inOffice": next.office,
        ":pto": next.pto,
        ":sick": next.sick,
      },
    }),
  );

  return {
    profile: data.profile,
    inOfficeDates: next.office,
    ptoDates: next.pto,
    sickDates: next.sick,
  };
}

export function findMarkForDate(data: UserData, date: string): DayMark | null {
  if (data.inOfficeDates.includes(date)) return "office";
  if (data.ptoDates.includes(date)) return "pto";
  if (data.sickDates.includes(date)) return "sick";
  return null;
}
