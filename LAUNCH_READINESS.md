# Launch Readiness

Last updated: 2026-10-08

## Status

**FUNCTIONALLY PARTIAL.** The partner marketplace expansion (properties for sale with confidential pricing, location-aware discovery, agents and representation, inquiries, viewings, the Tour Studio and the Owner/Agent Partner Portal) is built and verified end to end against a local database with row-level security. It is not yet running on the hosted project:

1. The four `20261008*` migrations and the updated demo seed are not applied to the hosted database. The Supabase connector needs re-authorising before that can be done from here.
2. The hosted database role `rental_app` still rejects its password, so the API cannot connect to the hosted database.
3. Demo media (photos, floor plans, 360° rooms for the properties for sale) has not been uploaded; `npm run demo:media` signs in as the demo accounts and must be run by the project owner.
4. The customer app has not been driven on a simulator or device. Simulator access was not granted.

## Verification

| Check | Result |
|---|---|
| API typecheck, lint, esbuild bundle | Pass |
| API tests: unit, contract and integration on real Postgres with RLS | 387 / 387 |
| Local end-to-end API walkthrough (owner, agent, two customers, local token issuer, local Postgres with RLS) | 65 / 65 checks |
| Owner web (Partner Portal) typecheck, lint, production build | Pass |
| Owner web tests | 36 / 36 |
| Partner Portal in a browser against the local API: one sign-in, workspace chooser, agent dashboard, leads with private budget, permission-aware editor, private terms save, owner Agent tab permissions, viewings, analytics, sale wizard, route guard | Pass |
| Customer app `flutter analyze` | No issues |
| Customer app tests | 158 / 158 |
| Customer app iOS simulator build (with geolocator and webview_flutter) | Pass |
| Customer app run on simulator or device | Not done: device access not granted |
| Hosted migrations, seed and media | Not done (see Status) |

The end-to-end walkthrough covers: price privacy in search, detail, saved listings and agent pages; sale price filters and sorting rejected; distance sort and radius; rounded approximate locations; owner creates a sale listing with private terms; agent permissions (edit, terms, no access without representation, pending invitation grants nothing, ending revokes listing and tour access); idempotent inquiries and open-inquiry reuse; cross-organization and cross-customer isolation for inquiries, conversations and viewings; agent reply moves the lead and appears to the customer as the agent; viewing slots, double-booking and duplicate-request guards, past slots rejected; confirmation notifies the customer and moves the lead; customer-facing statuses hide the internal pipeline; self-verification ignored and the admin path refused for non-admins; no fabricated ratings.

Bugs found and fixed during verification:
- The API's CORS preflight only allowed `GET`, `HEAD` and `POST`, so every browser `PATCH`, `PUT` and `DELETE` from the portal failed (listing edits, permissions, photo removal). Methods are now explicit and covered by a test.
- Customer app: messages from an agent were shown as the customer's own; sale listings crashed the listing parser (null price); the rental search defaulted to "Cebu City" and could return properties for sale; the "Available only" filter was never sent to the API and has been removed; the panorama vertical drag ran opposite to the horizontal drag; the release Android manifest lacked the `INTERNET` permission.

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

### Partner marketplace (`supabase/migrations/20261008*`)
- Database: `listings.intent` (RENT / SALE) with a check that sale rows carry no public price; private `listing_sale_terms` with no anon/authenticated grants; property coordinates with exact/approximate privacy and a GiST index; `agent_profiles` with a trigger so verification changes only through the platform path; `listing_representations` (PENDING / ACTIVE / ENDED) with per-listing permissions; `inquiries`, `viewings` (slot uniqueness, one active request per customer per listing, idempotent client references), `agent_tasks`; agent-aware RLS for listings, media, tours, conversations, messages, Realtime and Storage; tour providers (platform / Matterport), scene starting views and floor plans.
- API: geo search (`lat`, `lng`, `radiusKm`, `sort=DISTANCE`, `city`) and `/locations/areas`; sale listings and private terms for owners and permitted agents; floor plans; agents, representation, dashboards, clients, follow-ups and analytics from real rows (response metrics only with at least three samples); inquiries and viewings with notifications and conversation reuse; Tour Studio endpoints for owners and agents; admin-only agent verification.
- Partner Portal (`apps/owner-web`): one sign-in, Owner and Agent workspaces with a chooser and switcher, capability-driven navigation and a route guard; owner dashboard extended with inquiries and viewings; sale wizard and editor with location, floor plans, private terms and an Agent tab; inquiries pipeline, viewings, analytics; agent dashboard, leads, clients, represented properties (accept, decline, end), viewings, messages, follow-ups, tours, analytics and profile with verification requests; Tour Studio with a WebGL 360° preview, room upload and validation, rename, reorder, starting room and view, door and info hotspots with repositioning, room removal, publish and Matterport links.
- Customer app: Rent/Buy on Home, Buy categories (House & Lot, Condo, Townhouse, Lot, Commercial, Pre-selling), location picker (current location while in use, areas, anywhere) with denied, disabled and unavailable states; Near you from real distance search; Buy results with "Price available on inquiry", agent and 360° badge; property for sale with Overview, Photos, 360° Tour, Floor Plan and Map (OpenStreetMap, approximate area); Message and Inquire Now; inquiry with question chips and an optional private budget; schedule viewing in Philippine time with reschedule and cancel; Inquiries & viewings in Profile; agent profile; Matterport tours in a locked-down web view; tour starting views and a room strip.

## Blockers and manual steps

| # | Step | Who | Blocks |
|---|---|---|---|
| 0 | Re-authorise the Supabase connector (or use the SQL editor), apply `supabase/migrations/20261008000100` to `20261008000400`, then re-run `supabase/demo/seed-demo.sql` | Project owner | Every partner marketplace feature on hosted |
| 0b | Run `npm run demo:media` with `SUPABASE_PUBLISHABLE_KEY` and apply the generated SQL | Project owner | Photos, floor plans and 360° rooms for properties for sale |
| 0c | Set `SUPABASE_PUBLISHABLE_KEY` on the deployed API | Engineering | Tour Studio room uploads |
| 1 | Reset the hosted `rental_app` password (`alter role rental_app with password '…';`) and put it in `apps/api/.env.local` `DATABASE_URL` | Project owner | API against hosted data |
| 2 | Re-run `supabase/demo/seed-demo.sql` on hosted. This adds Customer B and fixes the older listings' property types; the Supabase connector needs re-authorising before it can be done from here | Project owner | Customer B, category accuracy |
| 3 | Grant simulator access, then run the demo script on iPhone 18 Pro Max | Project owner, then engineering | Device verification |
| 4 | Deploy the API behind HTTPS and set `APP_ENV`, `CORS_ORIGINS` and `PAYMENT_WEBHOOK_SECRET` | Engineering | Any non-local demo |
| 5 | Integrate a live payment provider. Production currently runs with `PAYMENT_PROVIDER=none` | Engineering and business | Launch |
| 6 | Configure Supabase Auth SMTP and email templates for confirmation and password reset | Project owner | Launch |
| 7 | App Store and Play signing, bundle IDs, privacy policy and store listings | Business | Launch |
| 8 | Storage clean-up for files uploaded during demos | Operations | Hygiene |

## Known limitations
- Agent verification is decided through the admin API (`/admin/agents/pending`, `/admin/agents/:id/verification`); there is no admin screen yet.
- Gyroscope look-around in the customer tour viewer is not implemented (optional in the brief).
- Map tiles come from the public OpenStreetMap tile server, which is fine for demos but needs a commercial tile provider before launch.
- Realtime updates for inquiries, viewings and agent messages have not been verified against hosted Realtime; locally the portal falls back to loading on open and after each action.
- Payments are sandbox only, by design.
- Tour Studio room uploads, listing photo uploads and floor-plan uploads write to Supabase Storage, which the local stack does not have, so they were not exercised end to end in this session. Owner photo uploads follow the path verified on hosted Storage in the previous release; agent uploads and 360° room uploads rely on the new Storage policies, which have not yet been tested against hosted Storage.
- Monthly rentals use the application flow. Deposits and advance months are shown but not collected online.
