# Office Tracker

A team office-day tracker. Each team member marks the days they were in the office, and the app reports their progress against the **60% of workable days** policy. Workable days = weekdays in the month minus public holidays (Ireland or Netherlands for v1) minus PTO.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind + shadcn/ui
- DynamoDB (DynamoDB Local for dev, AWS DynamoDB for prod)
- `date-holidays` for bank holidays

## First-time setup

```bash
npm install
cp .env.local.example .env.local
```

`.env.local` defaults point at DynamoDB Local on `localhost:8000`. No AWS credentials are needed for local dev.

## Run locally

You need Docker for DynamoDB Local.

```bash
npm run db:up      # starts DynamoDB Local in Docker (port 8000)
npm run db:init    # creates the "office_tracker" table
npm run dev        # starts Next.js on http://localhost:3000
```

Open <http://localhost:3000>, enter your email, pick your country, and start marking in-office days. Data persists across restarts via the `dynamodb-data` Docker volume.

```bash
npm run db:down    # stop DynamoDB Local when you're done
```

## Point at real AWS DynamoDB

1. Create the table in AWS (one-time):

   ```bash
   DYNAMODB_ENDPOINT="" \
   AWS_REGION=eu-west-1 \
   AWS_ACCESS_KEY_ID=... \
   AWS_SECRET_ACCESS_KEY=... \
   npm run db:init
   ```

2. Update `.env.local`:

   ```env
   DYNAMODB_TABLE=office_tracker
   AWS_REGION=eu-west-1
   # remove DYNAMODB_ENDPOINT (or leave it empty) so the SDK uses the real AWS endpoint
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   ```

The table uses on-demand billing and a simple `PK`/`SK` schema, so it fits comfortably in the DynamoDB free tier for a small team.

## Data model

Single item per user in the `office-tracker` table:

- Partition key attribute: `office-tracker` (String), value = the user's email.
- Item shape:

  ```json
  {
    "office-tracker": "alice@example.com",
    "email": "alice@example.com",
    "country": "IE",
    "createdAt": "2026-05-13T09:00:00.000Z",
    "months": {
      "2026-05": {
        "ptoDays": 3,
        "inOfficeDates": ["2026-05-06", "2026-05-07"],
        "updatedAt": "2026-05-13T09:30:00.000Z"
      }
    }
  }
  ```

All of a user's data lives in this one item, so every read/write is a single `GetItem`/`UpdateItem`.

## How the math works

For a given month:

```
workableDays  = weekdays − publicHolidays − ptoDays
targetDays    = ceil(workableDays × 0.6)
onTrack       = inOfficeCount ≥ targetDays
```

Weekend, holiday, and out-of-month dates are filtered out of `inOfficeDates` before they count.

## Auth model

Anyone with the URL can sign in by entering their email. There's no password — the data is non-sensitive and this is intended for an internal team. The email is stored in an HttpOnly cookie and used as the DynamoDB partition key.
