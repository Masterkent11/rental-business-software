# Launch Readiness

Last updated: 2026-10-07

## Status

**FUNCTIONALLY PARTIAL.** Every MVP feature is built and passes automated tests. The owner portal has been checked in a browser against real Supabase Auth, Storage and Realtime. Two things stand between this and a demo-ready system:

1. The hosted database role `rental_app` rejects its password, so the API cannot connect to the hosted database yet. Only the project owner can reset it.
2. The rebuilt customer app passes its widget tests and builds for the iOS simulator, but it has not yet been driven on a device. Simulator access was not granted during this session.

## Verification

| Check | Result |
|---|---|
| API typecheck, lint, esbuild bundle | Pass |
| API tests: unit plus integration on real Postgres with RLS | 327 / 327 |
| Owner web typecheck, lint, production build | Pass |
| Owner web tests | 24 / 24 |
| Customer app `flutter analyze` | No issues |
| Customer app tests | 139 / 139 |
| Customer app iOS simulator build | Pass |
| Customer app run on simulator | Not done: device access not granted |
| Owner portal in browser: sign in, create listing, upload photos to Storage, publish | Pass, against the local API |
| Customer API sees the new listing with photos and a server quote | Pass |
| Hosted Realtime: message insert reaches the owner session under RLS, toast shown | Pass |
| Demo seed, reset, reseed cycle | Pass, local |
| Supabase security advisors | Flagged items fixed (public SECURITY DEFINER, mutable search_path). Not re-run since the Supabase connector lost authorisation |

## What was built

### Database (`supabase/migrations/20261007*`)
- Listing details: property type, address, occupancy, bedrooms, bathrooms, floor area, cleaning fee, availability date, publish time. Media metadata with a unique storage path.
- Messaging: conversations, messages (idempotent per `client_id`), notifications, RLS, and the Realtime publication.
- Storage: public `listing-media` bucket (10 MB, JPEG/PNG/WebP) with organization-scoped write policies. Removed the open `organizations_insert` policy and revoked default anon/authenticated grants.
- Security-definer helpers moved to the `app_private` schema with pinned `search_path`. Participant read policies avoid recursion.
- Booking idempotency (`occupancies.client_ref`), guest count and note. Double-booking is prevented by the existing exclusion constraint.
- Fixed invoice policies that broke on an empty organization setting.

### API
- Owner listing management: create, edit, photos (register, remove, reorder), publish, unpublish and archive, with server-side publish validation.
- Public search with pagination, sort, price, bedrooms, guests, property type and date availability. Server-calculated stay quotes.
- Bookings: idempotent create, my bookings with server-assigned buckets, owner booking list, detail and status changes, availability blocks.
- Payments: sandbox only. Production refuses the sandbox provider, and payment intents require the booking's own customer.
- Messaging and notifications: start a conversation, send, mark read, owner inbox. Payment confirmation notifies both sides.
- Fail-fast configuration (`APP_ENV`, `PAYMENT_PROVIDER`, `CORS_ORIGINS`). Error responses carry stable codes such as `DATES_UNAVAILABLE` and never leak internals.

### Owner web
- Rebuilt on real data only; no fixtures remain. Dashboard, properties and the listing wizard, real photo upload with progress, bookings, messages with Realtime, applications, payments with CSV export, tours status, account and organization switcher.
- Brand identity, favicon and app icons.

### Customer app
- Discovery with server pagination and pull to refresh. Category search with server-side sort and filters. Listing details, 360° tour, and saved listings.
- Email sign in, sign up and password reset. Protected actions send the user to sign in and return them to where they were.
- Booking: server quote, idempotent hold, sandbox payment, confirmation, and recovery when dates are taken.
- My bookings (upcoming and past) and booking detail. Messages with Realtime, optimistic send, retry and de-duplication. Notifications.
- Release builds refuse to start without an HTTPS API address, and reject secret keys.
- App name "Rental Platform" on iOS and Android, plus the new launcher icons. The splash screen is unchanged and presentation-only.
- Sample fixtures moved out of `lib/` into `test/support/`, so they cannot ship.

### Demo
- `supabase/demo/seed-demo.sql`: verified demo organization, owner, two customers, five listings with CC0 photos and real 360° panoramas. Corrects the property types of the older base-seed listings.
- `supabase/demo/reset-demo.sql`: clears demo activity and owner-created listings. The append-only ledger is preserved.
- `apps/api/scripts/demo/seed-demo-media.mts`: downloads CC0 panoramas, renders listing photos, uploads as the demo owner, and generates SQL.
- `DEMO.md`: setup, accounts, reset and a 10-minute demo script.

## Blockers and manual steps

| # | Step | Who | Blocks |
|---|---|---|---|
| 1 | Reset the hosted `rental_app` password (`alter role rental_app with password '…';`) and put it in `apps/api/.env.local` `DATABASE_URL` | Project owner | API against hosted data |
| 2 | Re-run `supabase/demo/seed-demo.sql` on hosted. This adds Customer B and fixes the older listings' property types; the Supabase connector needs re-authorising before it can be done from here | Project owner | Customer B, category accuracy |
| 3 | Grant simulator access, then run the demo script on iPhone 18 Pro Max | Project owner, then engineering | Device verification |
| 4 | Deploy the API behind HTTPS and set `APP_ENV`, `CORS_ORIGINS` and `PAYMENT_WEBHOOK_SECRET` | Engineering | Any non-local demo |
| 5 | Integrate a live payment provider. Production currently runs with `PAYMENT_PROVIDER=none` | Engineering and business | Launch |
| 6 | Configure Supabase Auth SMTP and email templates for confirmation and password reset | Project owner | Launch |
| 7 | App Store and Play signing, bundle IDs, privacy policy and store listings | Business | Launch |
| 8 | Storage clean-up for files uploaded during demos | Operations | Hygiene |

## Known limitations
- Payments are sandbox only, by design.
- New 360° tours are produced by the media script, not uploaded by owners in the portal.
- Monthly rentals use the application flow. Deposits and advance months are shown but not collected online.
