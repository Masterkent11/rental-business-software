# Dependencies and risks

| ID | Finding / dependency | Consequence | Owner decision / mitigation | Ticket |
| --- | --- | --- | --- | --- |
| R01 | Explicit Phase 1 review gate not approved | Product implementation prohibited | Review this complete plan and record scoped approval | AUTH-008 |
| R02 | Composite-only auth imagery confirmed | Exact photo/card parity cannot be claimed | Resolve A01/A02 or approve documented substitute | AUTH-002 |
| R03 | Google absent from existing UI and local provider config | OAuth would be a new feature, not cosmetic wiring | Approve social-login scope, verify hosted provider and redirects | AUTH-006 |
| R04 | Signup/recovery/callback routes absent | Full functionality needs new approved client flows | Reuse Supabase; explicit session/confirmation states | AUTH-004, AUTH-006 |
| R05 | Owner self-provisioning contract not found | Signup alone does not create an owner workspace | Choose invitation path or review separately scoped backend gap | AUTH-004, AUTH-006 |
| R06 | Architecture says SSR cookies; implementation uses browser JS persistence | Mixed session implementations risk callback and logout failures | Select one coherent approach and test realtime/API/session behavior | AUTH-006 |
| R07 | Local redirect defaults point to port 3000; app runs 3200 | Callback/recovery return mismatch | Approve exact environment origins and allowlisted callback paths | AUTH-006 |
| R08 | Terms/privacy destinations absent | Legal links cannot be shipped as placeholders | Owner supplies or approves actual content/URLs | AUTH-004 |
| R09 | No implemented Storybook configuration | Auth stories depend on planned platform work | Reuse #86–#88; no second setup ticket | AUTH-007 |
| R10 | Exact fonts/logo originals and Google artwork unverified | Text wraps and fine shape parity uncertain | Resolve/approve asset register A03–A05 | AUTH-002, AUTH-005 |
| R11 | Role reference only covers desktop first step | Other breakpoints/steps unspecified | Approve missing adaptations and flow, no fabricated steps | AUTH-004, AUTH-005 |
| R12 | Matrix omits desktop Google and some reciprocal/recovery controls | Literal crop and functional parity conflict | Owner approves explicit reconciliation, preserve working capabilities | AUTH-003, AUTH-008 |
| R13 | Existing shell Node is 23.10.0 | Unsupported runtime can mislead validation | Use already installed Node 24.19.0; no config change | AUTH-001 |
| R14 | Current checkout predates latest remote master | Later implementation could regress newer source | Re-audit/reconcile in approved feature branch before coding; preserve uncommitted docs/assets | AUTH-003 |
| R15 | Hosted SMTP/confirmation/provider config unverified | Cannot promise live email or OAuth completion | Approved non-production verification with controlled test users | AUTH-006 |

No risk authorizes bypassing review, leaking credentials, enabling a provider, changing schemas, installing dependencies, inventing ratings or shipping flattened screenshot forms. Authentication UI and onboarding remain out of the consumer Flutter scope.
