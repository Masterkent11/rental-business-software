# Rental Platform — Demo Guide

Everything you need to run, reset and present the MVP: the customer app (Flutter), the owner portal (Next.js) and the API (NestJS) on Supabase.

## Demo accounts

These are demo-only accounts. They exist only in the demo seed. Never reuse them in production.

| Role | Email | Password | Name |
|---|---|---|---|
| Owner (Demo Homes PH, verified) | `demo.owner@example.com` | `DemoOwner!2026` | Dana Reyes |
| Customer A | `demo.customer@example.com` | `DemoGuest!2026` | Carlo Mendoza |
| Customer B (for isolation checks) | `demo.customer2@example.com` | `DemoGuest2!2026` | Bea Santos |

## Demo data

`supabase/demo/seed-demo.sql` creates the organization, the three accounts, and five published listings in Cebu City:

| Listing | Type | Mode | Price | 360° tour |
|---|---|---|---|---|
| Skyline studio with a city view | Condo | Nightly | ₱2,800/night + ₱500 cleaning | 2 rooms |
| Two-bedroom garden apartment in Lahug | Apartment | Monthly | ₱18,000/mo | 3 rooms |
| Family house with a veranda in Talamban | House | Nightly | ₱5,500/night + ₱800 cleaning | 3 rooms |
| Private room near USC Main | Room | Monthly | ₱7,500/mo | 2 rooms |
| Student bed space, utilities included | Boarding house | Monthly | ₱3,200/mo | Photos only |

Photos and panoramas come from Poly Haven (CC0 licence). Each panorama is a real equirectangular 360° capture of a matching interior (living room, bedroom, kitchen and so on), so the virtual tour lines up with the room it describes. Listing photos are rectilinear views rendered from the same panoramas.

The customer app has no built-in fake data. Everything it shows comes from the API.

## Run locally

Prerequisites: Node 22, Flutter 3.24+, Postgres 16 (`initdb`, `pg_ctl`, `psql` on PATH), Xcode for iOS.

### 1. Database (local Postgres that mirrors the Supabase schema)

```bash
cd apps/api
WITH_DEMO=1 ./scripts/test-db.sh up
psql -h 127.0.0.1 -p 55432 -U postgres -d rental_mvp -f ../../supabase/demo/generated-demo-media.sql
```

`generated-demo-media.sql` is produced by `npm run demo:media` (see below) and is git-ignored.

### 2. API

```bash
cd apps/api
npm install
npm run dev:local
```

The API listens on `http://localhost:8080`. `dev:local` uses the local database. `dev` uses `DATABASE_URL` from `apps/api/.env.local`, the hosted database. Sign-in tokens are always verified against `SUPABASE_URL`.

### 3. Owner portal

```bash
cd apps/owner-web
npm install
npm run dev
```

Open `http://localhost:3200` and sign in as the demo owner.

### 4. Customer app

```bash
cd apps/customer_app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:8080
```

On the Android emulator the API defaults to `http://10.0.2.2:8080`. Release builds refuse to start without an HTTPS `API_BASE_URL`.

## Hosted Supabase (project `yoscanunnqbzmlnwzift`)

1. Apply every file in `supabase/migrations/` in order.
2. Run `supabase/demo/seed-demo.sql` in the SQL editor.
3. Generate and upload the demo media:

```bash
cd apps/api
SUPABASE_URL=https://yoscanunnqbzmlnwzift.supabase.co SUPABASE_PUBLISHABLE_KEY=<publishable key> npm run demo:media
```

The script signs in as the demo owner, uploads to the `listing-media` and `tour-media` buckets under the demo organization's folder, and writes `supabase/demo/generated-demo-media.sql`. Run that file in the SQL editor, or rerun with `--apply` and `DATABASE_URL` set.

4. Set `DATABASE_URL` in `apps/api/.env.local` to the `rental_app` role, never `postgres` or the service role.

## Reset between demos

```bash
psql "$ADMIN_DATABASE_URL" -f supabase/demo/reset-demo.sql
psql "$ADMIN_DATABASE_URL" -f supabase/demo/seed-demo.sql
psql "$ADMIN_DATABASE_URL" -f supabase/demo/generated-demo-media.sql
```

The reset removes demo bookings, holds, payments, invoices, stays, applications, conversations, messages, notifications and saved listings, plus any property or listing the owner created during the demo. It then restores names and the five seeded listings. The ledger is append-only by design, so its history is kept. Files uploaded during a demo stay in Storage until removed from the dashboard.

## Environment

| App | Variable | Notes |
|---|---|---|
| API | `APP_ENV` | `development`, `demo`, `test` or `production` |
| API | `DATABASE_URL` | `rental_app` role (no BYPASSRLS) |
| API | `SUPABASE_URL` | JWT verification and public media URLs |
| API | `SUPABASE_SERVICE_KEY` | Server only, for tour and document storage. Never in a client |
| API | `PAYMENT_PROVIDER` | `sandbox` or `none`. `sandbox` is rejected when `APP_ENV=production` |
| API | `PAYMENT_WEBHOOK_SECRET` | Required for sandbox outside development |
| API | `CORS_ORIGINS` | Comma-separated. Required in production |
| Owner web | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable values only |
| Customer app | `--dart-define=API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Publishable values only. Secret keys are rejected at startup |

## Demo script (about 10 minutes)

1. **Customer: discover.** Open the app. Browse Featured and Near You, open a category (Condo), sort by price, and filter by bedrooms.
2. **Customer: details and tour.** Open "Skyline studio". View the photos, then tap the 360° tour and drag around the living room. Walk to the bedroom through the hotspot.
3. **Customer: book.** Tap Book, pick 3 nights and 2 guests. The server quote shows nightly rate × nights + cleaning fee. Sign in as Customer A when prompted; the app returns you to checkout. Confirm and pay (sandbox) to get a confirmation screen with a reference number.
4. **Owner: sees it live.** In the owner portal, Bookings shows the new paid booking and a notification arrives.
5. **Chat.** From the booking, the customer taps Message the owner. The message appears instantly in the owner's Messages; the owner's reply appears instantly in the app.
6. **Owner: publish.** Properties → New listing. Fill the wizard, upload real photos, and publish. Pull to refresh in the app to see it.
7. **Double-booking guard.** Sign in as Customer B and try the same nights. The app explains the dates were just taken and offers new dates.
8. **Isolation.** Customer B sees none of Customer A's bookings or conversations.
