# Mobile listing actions

Requested 2026 11 02. Scope registered before implementation on [#64](https://github.com/Masterkent11/rental-business-software/issues/64#issuecomment-6563406487). No duplicate issue.

Owner dashboard actions now use the supplied `for-sale-house.svg` and `for-rent-key.svg` in `public/assets/dashboard/overview-dashboard` on phones up to 600px. The phone labels are For sale and For rent, with supporting listing creation text. The sale action has a pale blue surface; rental retains the navy surface. Narrow phones omit the decorative arrow to preserve readable text. Tablet and desktop retain the existing Property for sale / Rental labels and plus icons; the new illustrations are hidden there.

Both existing creation routes are preserved. Percentage growth badges were omitted because the application has no corresponding metric contract. No backend, permissions, schema, authentication, dependency, commit, push or deployment changes. Existing staging remains unchanged.

Production build including TypeScript and lint passed. Browser verification passed at 320×568, 375×812, 390×844, 430×932, 834×1112, 1440×900 and 1920×1080. Checked supplied image loading, same row alignment, 72px phone targets, no document overflow, phone only visibility and both actual creation routes. Synthetic Owner session/API responses; no records created.

[Phone preview](owner-375.png), [narrow phone](owner-320.png), [desktop](owner-1440.png), [results](results.json). Build/lint/browser logs are adjacent.

## Superseded dimensions

The later user correction replaces the 72px phone actions with the 56px layout and restores the 176px hero. See [compact correction](../listing-actions-compact/README.md) for current evidence. Earlier captures remain historical.
