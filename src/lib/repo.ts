import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, PK_ATTR, TABLE_NAME, userKey } from "./db";
import type { CountryCode } from "./calendar";

export type UserProfile = {
  email: string;
  country: CountryCode;
  createdAt: string;
};

export type MonthRecord = {
  email: string;
  monthKey: string;
  ptoDays: number;
  inOfficeDates: string[];
  updatedAt: string;
};

type StoredMonth = {
  ptoDays?: number;
  inOfficeDates?: string[];
  updatedAt?: string;
};

type StoredUserItem = {
  [PK_ATTR]?: string;
  email?: string;
  country?: CountryCode;
  createdAt?: string;
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

function toMonthRecord(
  email: string,
  monthKey: string,
  stored: StoredMonth | undefined,
): MonthRecord {
  return {
    email,
    monthKey,
    ptoDays: stored?.ptoDays ?? 0,
    inOfficeDates: (stored?.inOfficeDates ?? []).slice().sort(),
    updatedAt: stored?.updatedAt ?? "",
  };
}

export async function getUserProfile(
  email: string,
): Promise<UserProfile | null> {
  const item = await getUserItem(email);
  if (!item) return null;
  return toProfile(item);
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
        "SET #email = :email, #country = :country, #createdAt = if_not_exists(#createdAt, :now), #months = if_not_exists(#months, :empty)",
      ExpressionAttributeNames: {
        "#email": "email",
        "#country": "country",
        "#createdAt": "createdAt",
        "#months": "months",
      },
      ExpressionAttributeValues: {
        ":email": normalizedEmail,
        ":country": country,
        ":now": now,
        ":empty": {},
      },
    }),
  );
  const item = await getUserItem(normalizedEmail);
  if (!item) throw new Error("User item missing after upsert");
  const profile = toProfile(item);
  if (!profile) throw new Error("User item malformed after upsert");
  return profile;
}

export async function getMonthRecord(
  email: string,
  monthKey: string,
): Promise<MonthRecord | null> {
  const item = await getUserItem(email);
  if (!item) return null;
  const stored = item.months?.[monthKey];
  if (!stored) return null;
  return toMonthRecord(email.toLowerCase(), monthKey, stored);
}

async function ensureUserItemExists(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: userKey(normalizedEmail),
      UpdateExpression:
        "SET #email = if_not_exists(#email, :email), #createdAt = if_not_exists(#createdAt, :now), #months = if_not_exists(#months, :empty)",
      ExpressionAttributeNames: {
        "#email": "email",
        "#createdAt": "createdAt",
        "#months": "months",
      },
      ExpressionAttributeValues: {
        ":email": normalizedEmail,
        ":now": new Date().toISOString(),
        ":empty": {},
      },
    }),
  );
}

async function ensureMonthExists(
  email: string,
  monthKey: string,
): Promise<void> {
  await ensureUserItemExists(email);
  const normalizedEmail = email.toLowerCase();
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: userKey(normalizedEmail),
      UpdateExpression:
        "SET #months.#mk = if_not_exists(#months.#mk, :seed)",
      ExpressionAttributeNames: {
        "#months": "months",
        "#mk": monthKey,
      },
      ExpressionAttributeValues: {
        ":seed": {
          ptoDays: 0,
          inOfficeDates: [],
          updatedAt: new Date().toISOString(),
        },
      },
    }),
  );
}

export async function setPtoDays(
  email: string,
  monthKey: string,
  ptoDays: number,
): Promise<MonthRecord> {
  await ensureMonthExists(email, monthKey);
  const normalizedEmail = email.toLowerCase();
  const safe = Math.max(0, Math.floor(ptoDays));
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: userKey(normalizedEmail),
      UpdateExpression:
        "SET #months.#mk.#pto = :pto, #months.#mk.#updatedAt = :now",
      ExpressionAttributeNames: {
        "#months": "months",
        "#mk": monthKey,
        "#pto": "ptoDays",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":pto": safe,
        ":now": new Date().toISOString(),
      },
    }),
  );
  const record = await getMonthRecord(normalizedEmail, monthKey);
  if (!record) throw new Error("Month record missing after PTO update");
  return record;
}

export async function setInOfficeDates(
  email: string,
  monthKey: string,
  inOfficeDates: string[],
): Promise<MonthRecord> {
  await ensureMonthExists(email, monthKey);
  const normalizedEmail = email.toLowerCase();
  const unique = Array.from(new Set(inOfficeDates)).sort();
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: userKey(normalizedEmail),
      UpdateExpression:
        "SET #months.#mk.#dates = :dates, #months.#mk.#updatedAt = :now",
      ExpressionAttributeNames: {
        "#months": "months",
        "#mk": monthKey,
        "#dates": "inOfficeDates",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":dates": unique,
        ":now": new Date().toISOString(),
      },
    }),
  );
  const record = await getMonthRecord(normalizedEmail, monthKey);
  if (!record) throw new Error("Month record missing after dates update");
  return record;
}

export async function listMonthsForUser(email: string): Promise<MonthRecord[]> {
  const item = await getUserItem(email);
  if (!item?.months) return [];
  const normalizedEmail = email.toLowerCase();
  return Object.entries(item.months)
    .map(([mk, stored]) => toMonthRecord(normalizedEmail, mk, stored))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}
