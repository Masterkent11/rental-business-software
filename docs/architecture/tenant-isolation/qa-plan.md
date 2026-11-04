# Tenant isolation QA and rollout acceptance

Status: planned. Existing executed checks are in audit.md; every case below remains NOT RUN end to end unless an individual evidence record explicitly says otherwise.

Fixtures after approval: ownerA_user/OWNER_A, ownerB_user/OWNER_B, agentA_user/AGENT_A, agentB_user/AGENT_B, pending/unverified Agent, no membership user, suspended/revoked member and separately provisioned platform admin. Use synthetic staging identities and no real customer records. Each evidence record must name test, fixture, endpoint/query/channel, expected/actual, sanitized trace, command/CI and canonical ticket.

| Scenario | Expected | Required surfaces | Current full status |
| --- | --- | --- | --- |
| Own Owner and Agent dashboards | Allow only eligible own context | UI, HTTP, DB | NOT RUN |
| Owner A reads/writes Owner B | Deny including guessed nested IDs, totals and bulk/export | HTTP, DB, UI | NOT RUN |
| Agent A reads/writes Agent B | Deny private leads, clients, messages, tasks, pipeline | HTTP, DB, realtime | NOT RUN |
| Owner only /agent and Agent only Owner root | Deny wrong portal | UI and HTTP | UI synthetic route PASS; authenticated HTTP NOT RUN |
| Forged tenant/role/user fields and organization header | No new authority | HTTP, DB | Resolver synthetic unit denial PASS; full HTTP NOT RUN |
| No membership, revoked, suspended or deactivated | Fail closed with safe recovery | HTTP, DB, cache, realtime | Source gaps reproduced; remediation NOT IMPLEMENTED/ACCEPTED |
| Expired/future/ended property grant | Deny new operation | Application, HTTP, DB, storage | Expired shared-gate gap reproduced; full NOT RUN |
| Approved representation | Only named resource/action fields | Listing, tour, inquiry, commercial contracts | Existing tests source reviewed; new full NOT RUN |
| Agent requests Owner financials/identity documents | Deny | HTTP, storage | NOT RUN |
| Authorized second membership | Explicit revalidation and isolated switch | UI, API, subscriptions/cache | Baseline synthetic chooser PASS; full NOT RUN |
| A/B/A switch while read/mutation pending | No stale data/error acknowledgement | Every private store and API context | Baseline Agent defect reproduced; final acceptance NOT RUN |
| Signed URL and file path guessing | Deny new signature, document prior URL TTL | Storage/API | NOT RUN |
| Realtime after revoke/account change | No further private events in invalid context | RLS and websocket | NOT RUN |
| Forged admin and partner /admin | Deny | HTTP/admin UI | Unauthenticated API 401 PASS; authenticated partner/admin NOT RUN |
| Admin aggregates and sensitive support | Least privilege, assurance, purpose, durable audit | Admin HTTP/audit | NOT RUN, future design |
| Migration/backfill/restore | Zero unresolved owner ambiguity; no data loss | Approved rehearsal DB | NOT RUN |

UI acceptance after policy correctness: Owner baseline remains stable; Agent retains its own metrics/navigation. Use approved vector asset sources and existing Owner banner/palette. Four viewport captures 375x812, 834x1112, 1440x900, 1920x1080; additionally 200% zoom, keyboard, focus, screen reader, empty/loading/error/populated/revoked states. No native menu overlap, duplicate labels or unauthorized options.

Do not call a passing toy repository test security evidence. CI must exercise actual application ports/adapters and RLS grants, including privileged signing and jobs. Full suite, lint, typecheck/build, migrations/restore, policy denial and human review are required for release. Rollout can proceed only through separately approved stages; no open P0 isolation defect is acceptable.
