# Commit preparation verification

Recorded November 2, 2026. All results describe this local working tree, not CI or a deployment.

| Check | Actual result |
| --- | --- |
| Owner Web final production build including TypeScript | Passed |
| Owner Web lint | Passed |
| Owner Web unit tests | 95 passed |
| API build, typecheck and lint | Passed |
| API tests without database | 444 passed, 251 skipped |
| Complete disposable PostgreSQL run | 651 passed, 44 failed, no skipped tests |
| Targeted disposable PostgreSQL run | 42 passed across 5 suites |
| Targeted migration and restore rehearsal | Passed; baseline counts preserved [4, 1, 1, 7] |
| Shared Owner and Agent header browser suite | Passed; synthetic identities and API responses |
| Expanded mobile pages browser suite | Passed at 4 phone widths |
| Final marketing browser suite | CRUD, error recovery, 4 viewport reflow and portal separation passed |
| Agile publisher unit tests | 20 passed |
| Changed file secret scan | 37 false positives, all verified as ticket tracking markers; no credential finding |

## Full database regression blocks release

The complete suite failed in applications, reservations, verification, marketplace flow, payments and rental policy integration tests. Most failures originate from partner_organization_lifecycle rejecting customer application inserts and payment notification delivery. Additional rental policy assertions fail downstream after the application failure. The failure is reproducible against the existing pending tenant boundary migration. No permissive policy adjustment or unrelated security fix was introduced during this branding and Git organization task.

The narrower tenant, partner shell, onboarding, marketing and Agent security suites pass. That result does not supersede the full regression. The database changes are retained in a ticket referenced local draft commit for review, not marked accepted or released. Issue 32 must resolve the customer workflow and notification scope regression, preserve cross tenant denials and rerun the complete suite before release. No production migration, hosted provider test, physical iPhone Safari check, push, merge or deployment occurred.

## Content preservation

Before regrouping, the branch had 898 staged paths. The current index and binary HEAD diff were saved outside the repository. User changes were preserved in place. Commits separate related work by existing verified GitHub ticket numbers. Shared composition roots receive only the feature registrations available at their stage. Later branding changes are isolated after the preexisting shell work. Original before/after captures and old planning status snapshots remain historical; this report records the current verification and release gate.

## Final preservation comparison

Compared all 962 paths in the preparation snapshot with the postcommit worktree. 961 retained identical bytes (including the intentionally deleted file remaining absent). marketing.css changed during preparation: whitespace formatting plus removal of background, border and border radius from .marketing-warning and .marketing-error. The current version was preserved rather than overwritten; its origin was not inferred. The prior content remains in the external binary patch/index backup and the reviewable delta and parsed rule comparison are adjacent. No other source or asset content mismatch was found. A final production build validates the combined committed source, including this stylesheet.

Historical command logs retain original whitespace and blank lines. Source files, scripts and migrations pass git diff --check. These historical logs were preserved without reformatting.

Verified ticket updates: [32 regression gate](https://github.com/Masterkent11/rental-business-software/issues/32#issuecomment-6564415617), [140 branding result](https://github.com/Masterkent11/rental-business-software/issues/140#issuecomment-6564415913), [64 compact actions](https://github.com/Masterkent11/rental-business-software/issues/64#issuecomment-6564416191). Each comment body was read back and matched the submitted text.
