# Owner Web

> **Status:** Written
> **Owner step:** Step 3+ — Frontend
> **Last updated:** 2026-08-20
> **Depends on:** [web-toolchain.md](web-toolchain.md), [ADR-0010](../12-adr/0010-web-stack.md), [owner/journey.md](../01-product/owner/journey.md), [payments-overview.md](../00-overview/payments-overview.md)
> **Informs:** the super admin web surface, which reuses this shell

The **primary management surface** ([product-scope.md](../00-overview/product-scope.md#product-surfaces)). Lives at [`apps/owner-web`](../../apps/owner-web).

Same bounded exception as the other two shells: UI and fixture data only, no domain rules, no computation the server owns.

---

## The screens

| Screen | What it does |
|---|---|
| **Dashboard** | Collection as claimed-against-received, occupancy ring, cash-versus-online share, the decision queue, occupancy by property, recent money |
| **Properties** | Per-property occupancy segments and **what the vacancy is costing** |
| **Applications** | The review queue, with competing applicants grouped |
| **Payments** | Who owes you, and every payment with its origin and recording lag |
| **Maintenance** | Sorted by what nobody has acknowledged |
| **Listings** | Both approval gates, and publish delegation |
| **Virtual tours** | The authoring studio — upload panoramas, place hotspots, publish |

---

## Why it is designed around one sentence

From [vision.md](../00-overview/vision.md): the pilot succeeds when *"an owner answers 'who owes me money this month?' from the platform alone."*

So collection is the headline, and it is **never a single revenue figure**. Claimed and received are two bars, and the gap between them is the number the owner is actually chasing. A dashboard that showed one "revenue" line would hide the whole question.

Four decisions follow from that:

### The chart shows the gap, not the total

Six months, two bars each. Where received matches claimed the bar is green; where it falls short it is amber. Nothing about the design lets a short month look like a full one.

### Vacancy is priced, not counted

"2 vacant" is a number an owner can look at all year without acting. **"₱17,000 idle per month"** is not. Each property shows contracted rent against what it would earn fully let, and the difference is stated in pesos.

### The queue is on the dashboard, not behind a tab

Applications to review, maintenance nobody has acknowledged, listings awaiting platform approval — all on the first screen, because a dashboard of figures alone makes an owner hunt for their own work.

Unacknowledged maintenance is styled as the loudest thing on the page. The tenant journey is explicit that acknowledgement matters as much as resolution, and an owner cannot act on that unless their tool says so.

### Cash and online are never one column

Every payment row carries **money moved** and **recorded**, plus a lag chip. Online payments show a dash; cash shows 14h, or 38h. That gap is a staff-performance signal the owner has no other way to see, and it exists only because the domain stores *received* and *recorded* as separate facts rather than inferring one from the other.

The page states plainly that recorded cash is a staff attestation, not something the platform processed — and that reconciliation against provider settlements covers online payments only.

---

## Design

Same tokens, type scale, and radii as the customer app and tenant web. One deliberate difference: **a dark rail**.

The customer and tenant surfaces are light and photography-led because they are about *places*. This one is a working tool someone has open all day, and dark chrome keeps the operator's furniture from competing with the data inside it. Everything inside the frame — palette, type, spacing — is identical.

Charts are hand-drawn SVG: a two-series bar chart, segmented occupancy bars, sparklines, and a ring gauge. No charting library, because four shapes are a few dozen lines each and a dependency would bring a theming system that fights the design tokens instead of using them. Every colour is a CSS variable, so light and dark follow the rest of the product for free.

---

## Running it

```bash
cd apps/owner-web && npm run dev     # http://localhost:3200
```

Verified: `typecheck`, `lint`, and `build` clean; all six routes prerendering; walked in a browser at 1280px.

---

## The tour studio

Authoring is the V1 risk named in Step 1 — not capture, not playback. If placing hotspots is too hard, listings ship without tours and the differentiator evaporates.

The studio is built around the two questions that make it hard:

- **Where does this hotspot go?** Click the panorama to drop one; pick its destination from the scene list. A navigation hotspot with no target renders red, labelled *goes nowhere*, rather than saving silently.
- **Why can I not publish?** The publish gate never sits greyed out without explanation. It lists every blocker by name — a scene still tiling, a hotspot leading nowhere, a scene no other scene links to. That is [I-07](../03-domain/invariants.md#i-07--tour-navigation-is-total) made visible, and it matters because a dead-end walkthrough on a published listing is worse than no tour: the customer already trusted it.

Uploads show real processing state, because a 15 MB panorama on Philippine mobile data is not instant and a UI that pretends otherwise looks broken.

Full pipeline: [07-integrations/virtual-tour-pipeline.md](../07-integrations/virtual-tour-pipeline.md).

## Not built yet

Staff management, reports beyond the dashboard, lease issue, and the booking calendar. Those need Step 5's contracts before they are worth more than a shell.
