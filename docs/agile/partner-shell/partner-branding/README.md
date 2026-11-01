# Partner brand identity

Scope registered before code on [issue 140](https://github.com/Masterkent11/rental-business-software/issues/140#issuecomment-6563897658), linked to shared shell issue 64. No duplicate ticket. Current sprint: Partner Experience, November 1–14, 2026.

The authenticated Owner and Agent shell now presents the authorized workspace logo, workspace name and role subtitle in one shared PartnerBrand component. The separate repeated workspace name is removed. The phone header keeps its compact controls; the navigation drawer presents the same partner identity. A neutral building icon appears when no logo is saved. Sign in and onboarding retain the platform identity.

Account already provides upload, replacement, removal and persisted reload for PNG, JPEG or WebP up to 2 MiB. This change reuses its existing workspace scoped provider, API and permissions. The API normalizes logos without cropping their aspect ratio; the shell uses contain sizing. No new public bucket, tenant selector, permission, dependency or schema was introduced by this UI correction. Agent identity uses the current authorized Agent profile display name; Owner identity uses the organization name.

## Executed verification

Owner Web production build, lint and all 95 unit tests passed. The shared browser suite passed both roles at 320, 375, 834, 1364, 1440, 1672 and 1920 pixels, including upload, persisted reload, removal, invalid format handling, header and drawer logo reuse, no repeated workspace title, scoped keyword search, one row controls and no horizontal document overflow. The header and mobile drawer captures were visually inspected.

Browser coverage uses synthetic identities and intercepted API responses. No real partner logo was uploaded. Physical iPhone Safari, hosted provider behavior and production database migration application were not run. The broader inherited database regression is documented separately in the Git organization report and issue 32; this browser pass does not establish full release readiness.

[Owner header](screenshots/owner-partner-header-logo.png), [Agent drawer](screenshots/agent-partner-drawer-logo.png), [geometry results](screenshots/results.json).
