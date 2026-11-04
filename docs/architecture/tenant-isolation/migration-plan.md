# Staged tenant migration and rollback plan

Current status: two additive migrations authored and rehearsed only in a disposable local PostgreSQL cluster after explicit continuation. Remote execution and production data remain unauthorized. Original planning sequence below is retained; see implementation.md for the resulting canonical projection design and exact migration files.

## Preconditions

Approve ADR, role provisioning, onboarding verification access, collaboration rights, legacy membership handling and admin scope. Confirm GitHub/Jira canonical mapping. Capture reviewed schema/ACL/function definitions, backup/restore capability and maintenance operators. New partner registry/membership design must adapt existing organizations and Agent profiles, not recreate them.

Current configured catalog has 46 public application tables and 123 public/storage policies visible in the read-only snapshot. `provider_events` is the one public application table without RLS; effective anon/authenticated SELECT/INSERT are denied, and app SELECT/INSERT are allowed. Treat it as an explicit internal service exception with a documented policy, not proof of public leakage. The app role has no table ownership or BYPASSRLS. Marketing tables and the common tenant registry are not present there. No current live row counts, PII or orphan scans were collected.

## Additive sequence after approval

1. Define one canonical mapping per existing Owner organization and Agent profile. IDs and parent relationships remain stable. Document null, inactive and ambiguous cases; do not silently assign them. Review references to identity `TENANT` capability because it means a residential tenant today, not a partner tenant boundary.
2. Add registry links and needed membership lifecycle facts with conservative defaults. Default existing uncertain entries to pending review, never active or verified. Keep legacy capability truth and transition source documented; avoid long lived dual independent authorization stores.
3. Generate backfill reconciliation plan and dry-run counts on synthetic or specifically approved clone data: organizations, Agent profiles, memberships, private resources, orphan parents, duplicate live grants and cross tenant relationships. Reports contain counts and anonymized identifiers only.
4. Harden action policies and grant expiry/revocation before broad UI switching. Preserve customer booking/application access and public catalog projections. Add same tenant FKs/constraints through parent ownership where necessary. Validate indexes against real lookup/query shape and data scale.
5. Update RLS, security definer helper exposure, private storage signing and realtime to the same policy. Recheck grants as well as policies. Rehearse with application role and authenticated/anonymous paths, including maintenance bypass role paths. No public private-media fallback.
6. Migrate repositories/use cases and allowed workspace resolution behind a reviewed feature flag. Shadow compare redacted allow/deny outcomes on approved staging data. Do not temporarily widen permissions to keep both implementations working.
7. Cut over one bounded cohort after all denial, concurrency and rollback tests pass. Stop on unexpected permission changes, orphan counts, data visibility, RLS failures or latency regressions.
8. Only then remove obsolete read/write paths after a retention window and a separately approved destructive migration. No original ID deletion, organization merging or blanket capability grants.

## Rehearsal and release evidence required

Record pre/post row and ownership counts, orphan/ambiguity lists, constraint validity, effective ACLs, actor matrix results, revoked grant behavior, signed URL expiry, job/realtime behavior, benchmarked indexes, backup restore test and rollback timing. Neither staging nor production rehearsal has run in this audit. Exact SQL names, DDL locks and duration remain NOT APPROVED / NOT MEASURED.

## Rollback and forward recovery

Disable the new context feature and freeze migrations on anomaly. Do not fall back to a permissive legacy authorization path when a new denial detects an unsafe grant. Restore only the last reviewed policy/code combination; protect new legitimate writes and export mapping/audit lineage first. Prefer forward repair for ownership ambiguity. Restore from backup only under a separately authorized incident plan with reconciliation for writes after backup. Preserve existing payments, identity evidence and participant histories. Every destructive cleanup, credential rotation, deployment and production data operation needs separate approval.
