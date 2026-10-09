# Partner Marketplace Expansion — Implementation Map

Scope: Buy (sale) listings with confidential pricing, real-estate agents and representation, inquiries, viewings, location-aware discovery, a Matterport-compatible tour studio, and a single Partner Portal with Owner and Agent workspaces.

## Existing foundations reused

| Concern | Existing piece | How it is extended |
|---|---|---|
| Physical asset | `properties` → `rentable_resources` → `listings` | `listings.intent` (RENT / SALE); sale listings use a whole-property resource with `rental_mode = 'SALE'` |
| Public listing reads | `postgres-listing.repository.ts` `SELECT` + `toListingHttpResponse` | Sale rows return `pricing: ON_INQUIRY` and never read the private table |
| Confidential price | none | `listing_sale_terms` table, organization-scoped RLS, no grants to anon/authenticated, never joined by public queries |
| Identity | `user_capabilities`, `organization_members`, `resolvePrincipal` | New `AGENT` capability (platform-wide), `agent_profiles` |
| Isolation | transaction-local `app.organization_id` / `app.user_id` | Agent reads run under `app.user_id`; policies resolve the caller's agent profile through `app_private` helpers |
| Messaging | `conversations` / `messages` / Realtime | `conversations.agent_id`, sender role `AGENT`, agent unread tracking, Realtime policies for agents |
| Notifications | `notifications` | New kinds for inquiries, viewings and representation |
| Tours | `virtual_tours`, `tour_scenes`, `tour_hotspots`, sharp panorama processor | Provider `PLATFORM` / `MATTERPORT`, scene initial view, hotspot repositioning, scene removal, delegated-token storage writes |
| Media | `media_assets` + `listing-media` bucket | Kind `FLOOR_PLAN` with a label |
| Owner web | Zustand stores, composition root, shell | Workspaces (Owner / Agent), capability-driven navigation, new pages |
| Customer app | Riverpod, go_router shell, shader panorama viewer | Rent/Buy explore, buy results, confidential detail, agent profile, inquiry, viewing, location, map, Matterport embed |

## New tables

- `listing_sale_terms` — private asking price, negotiability, commercial notes.
- `agent_profiles` — public agent identity; verification state only changes through the platform-admin path.
- `listing_representations` — PENDING → ACTIVE → ENDED, with per-representation permissions.
- `inquiries` — NEW → CONTACTED → QUALIFIED → VIEWING_SCHEDULED → NEGOTIATING → CLOSED / LOST, linked to a conversation, optional private buyer budget.
- `viewings` — REQUESTED → CONFIRMED / RESCHEDULE_REQUESTED → COMPLETED / CANCELLED, slot uniqueness per listing, idempotent submission.
- `agent_tasks` — follow-ups for the agent workspace.

## Geography

`properties.latitude/longitude` plus `location_privacy` (EXACT / APPROXIMATE). A GiST index on `point(longitude, latitude)` serves bounding-box prefiltering; distance is a haversine expression computed from the public (possibly rounded) coordinates, so approximate locations cannot be triangulated. Customer coordinates are query parameters only and are never stored.

## Phase order

1. Migrations and domain rules.
2. API: geo search, sale listings, agents, representation, inquiries, viewings, tours.
3. Partner Portal workspaces and navigation.
4. Owner sale editor and agent assignment.
5. Agent dashboard, leads, clients, viewings, tasks, messages.
6. Tour studio (platform and Matterport).
7. Customer Buy flows.
8. Customer location.
9. Customer tour viewer upgrades.
10. Hardening, security tests, end-to-end.
