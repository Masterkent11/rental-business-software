# Mobile partner experience review

Implemented locally on `codex/partner-mobile-navigation`. Ready for visual review; not pushed, committed, deployed or released. Existing index and unrelated authentication styling are preserved. [Plan and backlog reconciliation](plan.md).

## Delivered

The shared phone header keeps Menu, scoped Search, Notifications and Account on one row. Below 360px Search opens an accessible dialog with the existing search results, keyboard selection and Command or Control K. The phone dock reuses each portal's authorized navigation and opens the existing drawer for More. It respects safe areas, scroll clearance, reduced transparency and reduced motion. Tablet and desktop retain the existing navigation.

Owner and Agent dashboards use compact two column phone metrics. Agent Deals spans the final row. The Owner hero has readable supporting copy and equal 44px actions. The drawer now shows the Westayplace mark and name, keeping its existing authorized links and sign out.

Properties uses a single horizontally scrollable status row with keyboard selection, two row search/view controls, compact aligned property cards, readable price/status, inline activity metrics and pagination clear of the dock. Bookings shares the compact tabs and empty states. Analytics uses two column summaries and a chart whose labels fit the phone viewport.

An open phone conversation uses the viewport for the thread and composer; the global header and dock are hidden until Back to inbox. VisualViewport resize updates the available height without changing messaging state or API behavior. Existing send, retry, read, history and realtime operations remain. The entry loading indicator is centered without depending on authentication route CSS.

Tour Studio has a taller phone 360 view, overlay controls with accessible labels, compact room settings, upload form and room strip. Fullscreen uses the original source URL where available, with the existing renderer texture bound. The supplied data supports spherical photos and hotspots. It does not provide Matterport dollhouse geometry or guarantee sharpness beyond the uploaded source.

## Verified

All commands completed with exit code 0. Logs are in [evidence](evidence/).

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, no warnings |
| `npm test` | 95 passed, 0 failed, 0 skipped |
| `npm run build` | Passed production build |
| Mobile navigation browser | Both roles at 320×568, 375×812, 390×844, 430×932, 834×1112, 1440×900 and 1920×1080; actual routes, history, More, search dialog, keyboard, preferences, safe areas, sign out and content clearance passed |
| Mobile pages browser | Properties filter, status keyboard selection, pagination, Bookings, empty inbox, Analytics and drawer at four phone widths passed |
| Messaging browser | Owner and Agent full viewport threads and eight replies through intercepted API responses passed; available height reduction to 400px keeps the Owner composer visible |
| Tours browser | Four phone viewports, controls, fullscreen/Escape and room rename through intercepted API responses passed |
| Loading browser | Opening workspace state centered at 375×812 passed |
| Shared header browser | Both roles, header geometry, avatar dropdown, shortcuts, branding and scoped search passed |
| Google refresh browser | Sign in and signup at four viewports; reload, delayed availability and retry passed |
| Authentication browser | Onboarding for both roles, validation, confirmation, recovery, legal, OAuth callback success/denial and reflow passed |
| Marketing browser | Existing CRUD flow, four viewport reflow, errors and portal separation passed |

These browser checks use synthetic identity/provider/API responses and local production build port 3204. They verify frontend behavior, not a live production API deployment. Physical iPhone/Safari, native software keyboard, screen reader walkthrough and hosted end to end acceptance remain not run. No authentication policy, membership, database or backend changes were made.

## Visual evidence

[Before](before/) contains 14 original dashboard captures. [After](after/) contains both portal dashboard captures and search, drawer and safe area evidence. [Screens](screens/) contains 77 captures covering the expanded feedback, including viewport and full page versions. A full page capture places a fixed dock at the capture viewport's position; use the `viewport` images to review actual phone framing.

- [Properties at 390px](screens/properties-390-viewport.png)
- [Bookings at 375px](screens/bookings-375-viewport.png)
- [Owner chat at 375px](screens/chat-375.png)
- [Agent chat at 375px](screens/agent-chat-375.png)
- [Analytics at 390px](screens/analytics-390-viewport.png)
- [Branded drawer](screens/drawer-390.png)
- [Tour studio](screens/tour-studio-375.png)
- [Centered loading](screens/opening-workspace.png)

The original full page 834px baselines have repeated raster tiles below the first 1024px, so those lower pixels are not used as a visual equivalence claim. Viewport resizing also required waiting for responsive image selection before decoding/capture. The regression records exact unchanged header and metric bounding boxes for all six tablet/desktop role combinations and zero changed toolbar pixels. Agent content differs by 0, 1 and 0 pixels at 1440, 834 and 1920 respectively. Owner 834/1440 content has hover surface differences from the original capture (48,609 / 104,596 pixels); Owner 1920 is unchanged. Full content pixel equivalence is not asserted for the hover affected captures. Original baseline artifacts were not replaced.

## Governance and preservation

Canonical current sprint work remains [#64](https://github.com/Masterkent11/rental-business-software/issues/64) and [#139](https://github.com/Masterkent11/rental-business-software/issues/139), Partner Experience, November 1–14, 2026. Expanded work is cross referenced to existing [#25](https://github.com/Masterkent11/rental-business-software/issues/25), [#67](https://github.com/Masterkent11/rental-business-software/issues/67) and [#73](https://github.com/Masterkent11/rental-business-software/issues/73); no duplicate Epic or issue was created. Registration comments preceded implementation. Jira WSP is not connected; no Jira publication is claimed. No PR exists for the uncommitted local changes. Visual acceptance and release approval remain open.

[evidence/preservation.json](evidence/preservation.json) verifies the original staged binary diff SHA256 `23f1480b8e7b7cf826b2654db41da947b6a3f78a4209e9d49f05f5890748c22d` and byte identical unrelated `auth.css` diff. No source comments or dependencies were added. UI behavior remains connected to the existing stores, use cases and repository adapters.

Review updates were published and verified on [#64](https://github.com/Masterkent11/rental-business-software/issues/64#issuecomment-6561098813), [#139](https://github.com/Masterkent11/rental-business-software/issues/139#issuecomment-6561112771), [#25](https://github.com/Masterkent11/rental-business-software/issues/25#issuecomment-6561112853), [#67](https://github.com/Masterkent11/rental-business-software/issues/67#issuecomment-6561113161) and [#73](https://github.com/Masterkent11/rental-business-software/issues/73#issuecomment-6561113392).
