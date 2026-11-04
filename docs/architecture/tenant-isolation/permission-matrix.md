# Tenant permissions and data ownership

Decision state: proposed for approval; no new grants issued.

| Actor | Own active authorized tenant | Other Owner private tenant | Other Agent private tenant | Explicit represented property | Admin monitoring |
| --- | --- | --- | --- | --- | --- |
| Owner A/B/N | Allow action policy | Deny | Deny | Own property only; grant management by ownership | Deny |
| Agent A/B/N | Allow action policy | Deny | Deny | Only current accepted resource and permitted fields/actions | Deny |
| No membership or inactive account | Deny; onboarding/pending state only | Deny | Deny | Deny | Deny |
| Suspended/revoked member | Deny subsequent authorization | Deny | Deny | Deny | Deny |
| Unverified partner | Only explicitly approved private onboarding actions | Deny | Deny | Verification gated operations denied | Deny |
| Platform admin | No inherited partner context | No blanket detail access | No blanket detail access | Purpose bound support permission only | Approved aggregate permission plus MFA/audit |

Multiple independently approved memberships are distinct contexts. The existence of a single identity does not grant a second membership. A valid property representation never creates Owner membership. Staff membership is explicit and remains scoped to its own organization.

## Canonical ownership map

| Current tables | Authoritative boundary and proposed mapping |
| --- | --- |
| organizations, organization_members | Existing Owner tenant and membership; add registry mapping without replacing IDs |
| properties, rentable_resources, listings, media_assets, listing_sale_terms, occupancies, resource_night_status | Owner organization, directly or by enforced parent; public PUBLISHED fields explicitly allowlisted |
| reservations, stays, invoices, invoice_lines, payments, payment_applications, ledger_entries | Owner organization plus specific customer entitlement; do not grant financial dashboard access through property representation |
| applications, application_drafts, application_documents, identity_verification_sessions, identity_evidence_uploads, identity_capture_limits | Applicant identity and associated Owner application/reviewer permission; identity evidence private, not generic Agent property media |
| agent_profiles, agent_tasks, agent_referral_codes | Agent profile mapping to independent partner tenant; public profile projection separate from private workspace |
| listing_representations, lead_assignments, lead_referrals, listing_change_proposals | Explicit collaboration and assignment; listing remains Owner owned, agent sees only permitted resource projection |
| inquiries, viewings | Originating listing/Owner boundary with explicitly assigned Agent and customer participant access; preserve reassignment history without widening live access |
| conversations, messages, notifications | Participant/organization based; each response and realtime event needs matching entitlement; no global partner inbox |
| virtual_tours, tour_scenes, tour_hotspots | Owner resource with named representation permission; public published projection only |
| user_profiles, user_capabilities, saved_listings, policy_acceptances | Platform identity/self entitlements; not blindly duplicated per partner tenant |
| content_pages, support_requests, listing_view_events | Explicit public content, reporter/approved support and bounded analytics policies; inventory before adding tenant ownership |
| provider_events, payment_notification_outbox | Internal service data; no partner direct rights; service policy and redacted operational access |
| marketing_media, marketing_drafts, marketing_draft_media | Local Phase 1 migration only, absent from configured catalog; Agent private ownership and explicit property-media authorization remain required |

Exact columns, composite FKs, orphan counts and customer exposure fields must be rehearsed with approved synthetic/clone data before SQL is written. This table is not a claim that every listed path has completed adversarial testing.
