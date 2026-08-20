# Customer App

> **Status:** Written
> **Owner step:** Step 3+ — Frontend (started early, deliberately)
> **Last updated:** 2026-08-20
> **Depends on:** [flutter-toolchain.md](flutter-toolchain.md), [01-product/customer/journey.md](../01-product/customer/journey.md), [00-overview/product-scope.md](../00-overview/product-scope.md#product-surfaces)
> **Informs:** the future per-surface frontend docs, and the Step 5 API contracts this app will consume

The Flutter app for the **Customer** surface — *"the primary discovery surface"* ([product-scope.md](../00-overview/product-scope.md#product-surfaces)). It lives at [`apps/customer_app`](../../apps/customer_app).

---

## The exception this represents, stated plainly

The root README says there should be no application code until the product definition and domain model are frozen. This app breaks that rule on purpose, and the exception is recorded in the decision register's [amendment log](../00-overview/product-decisions.md#amendment-log).

The bargain:

| It may contain | It may not contain |
|---|---|
| Toolchain, project structure, build verification | Any domain rule from [03-domain](../03-domain/) |
| Routing, theming, a design system | Availability, occupancy, or pricing logic |
| Screen shells reading in-memory fixtures | API clients, real contracts, persistence, auth |
| The tour **interaction model** | A 360° renderer or media pipeline |

**If the app and the documents ever disagree, the documents win and the app changes.** No document is amended to match code. That sentence is the entire reason this exception is safe to grant.

### Why grant it at all

Three things are cheaper to learn now than after Step 5:

1. **Whether the toolchain works at all** on this machine. It does — web release builds, analyzer clean, tests pass. That would have been an unpleasant discovery in month four.
2. **Whether the tour feels like walking through a place.** [product-scope.md](../00-overview/product-scope.md#risk-2--virtual-tour-on-the-critical-path) names the tour as V1's biggest delivery risk. The *interaction model* — scene labels, hotspot navigation, the selector — can be judged today, without a single panorama.
3. **What the money and availability copy look like on a phone.** ₱8,500/month and "Available Jan 1" on a 375pt screen is a design constraint, and it is easier to see than to argue about.

---

## What exists

The whole customer journey up to the point where money would change hands.

```
  Discover ──▶ Listing detail ──▶ Virtual tour
     │              │                   │
     │              │                   └──▶ (straight into apply/book)
     │              │
     │              ├──▶ Apply      (long-term)  ─┐  states the intent,
     │              └──▶ Book dates (nightly)    ─┘  stops before payment
     ├──▶ Saved  ──▶ move-in cost comparison
     └──▶ Account
```

| Screen | What it does |
|---|---|
| **Discover** | Large-title header, search, filter sheet, a featured carousel, and result cards carrying price, **move-in cost**, availability copy, and a tour badge |
| **Filters** | Rental kind, resource type, budget, has-a-tour, available-only — with a live match count on the confirm button |
| **Listing detail** | Swipeable gallery, availability, tour callout above the fold, move-in cost breakdown, description, what-you-share (bed spaces), amenities, terms, house rules, verified owner, sticky commit bar |
| **Virtual tour** | Fullscreen drag-to-look, frosted chrome, navigation and info hotspots, always-visible room label, scene picker, and a path straight into apply/book |
| **Book dates** | Three-month calendar with taken nights struck through, minimum-stay rule, live total |
| **Apply** | Move-in date, occupants, document capture, and the plain statement that applying reserves nothing |
| **Saved** | Shortlist plus a side-by-side of what each place costs to *enter* |
| **Account** | A shell. No authentication — identity is a Step 3 decision |

### Structure

```
lib/
  main.dart              entrypoint
  app/                   MaterialApp, router, route paths
  design/                tokens, theme, glass chrome, image loading, money
  fixtures/              view models + sample data  ← not domain models
  features/
    shell/               the three-tab frame
    discovery/           search, filters, cards
    listing/             detail + move-in cost
    tour/                the 360° viewer shell
    booking/             date selection
    application/         apply
    saved/  account/
```

Feature-first, one directory per slice, so the structure survives contact with the vertical-slice architecture Step 3 is expected to choose without being a prediction of it.

---

## Making it feel native rather than "cross-platform"

The look is a deliberate set of choices, not a theme:

| Choice | Why |
|---|---|
| System font stack (SF Pro on Apple platforms) | The single biggest thing that stops a Flutter app looking like a Flutter app |
| Material ripples and tints switched off | Ripples are an Android signature; this surface should feel iOS-native |
| Cupertino page transitions on every platform | Consistent in the simulator and in a browser review |
| Bouncing scroll physics everywhere | Same reason |
| Frosted glass over photography, never opaque bars | Taken from the design reference — the blur is what makes overlay controls read as being *in front of* an image |
| Near-black ink with one warm accent | Photography carries the colour. A tinted chrome is what makes a marketplace look like a template |
| Negative letter-spacing on display sizes | Tight tracking is most of the difference between a considered screen and a default one |
| Haptics on selection and commitment | Cheap, and conspicuously absent when missing |

**Photography is remote and stands in for a media pipeline that does not exist yet.** Every image degrades to a warm tonal panel when it cannot load — offline, in a widget test, or on bad mobile data — so the app is fully navigable with zero images. That is the honest failure mode, not a broken-image glyph.

---

## Three things the screens say out loud

Each is a product requirement from the journey that a generic marketplace UI would quietly drop.

1. **Move-in cost, everywhere a price appears.** Comparing bare monthly rent is misleading where entry is three months up front — an ₱8,500 unit costs ₱34,000 to move into. It is on the card, on the detail screen, in the sticky bar, and it is the whole basis of the Saved comparison.
2. **Applying does not reserve the place.** Several customers may apply for one unit; approval is what takes it off the market. The apply screen says so before the button, not after.
3. **Photo-only listings are visibly less compelling.** Listings with a tour get a taller card and a badge. That asymmetry is deliberate — it is what motivates owners to author tours, and the product depends on them doing so.

---

## Three decisions worth knowing about

### The app never computes availability

Availability arrives as **copy the server already decided** — `"Available now"`, `"Dec 26–29 taken"` — and the client renders it. It never receives dates and derives a state from them.

This is not laziness. [U-01](../03-domain/occupancy-model.md) gives every resource exactly one occupancy timeline, with the long-term state and the nightly calendar as projections of it. A client that re-derived either would be a second source of truth for the one thing the platform must never be wrong about, and it would be wrong in a way nobody notices until a guest arrives at an occupied condo.

### Money is integer centavos

`850000`, formatted once, in `lib/design/money.dart`. No doubles touch an amount, on either side of the wire — the same rule [money-model.md](../03-domain/money-model.md#representation-rules) fixes for the domain.

### The tour is a shell, and the shell is the valuable part

The viewer has no equirectangular projection, no tiled delivery, no decode budget — those need a real integration decision and a package choice, and making that choice now would settle it by accident.

What it *does* have is the interaction model: fullscreen with no navigation bar competing for the screen, a scene label always visible, tappable hotspots that move you between scenes, and a selector to jump anywhere. That is the part that decides whether a tour feels like walking through a place or like flipping slides — and it is judgeable today with a gradient standing in for a panorama.

---

## Running it

```bash
cd apps/customer_app && flutter run -d chrome
```

Verified working: `flutter analyze` (clean), `flutter test` (10 passing), `flutter build web --release` (succeeds), and the flow walked end to end in a browser at 390×844. Toolchain constraints, including the iOS/Xcode ceiling, are in [flutter-toolchain.md](flutter-toolchain.md).

---

## What comes next, and in what order

1. **Nothing, until Step 3.** The app is at the boundary of what it may contain without pre-empting architecture.
2. After **Step 3**: authentication and session handling, the state and error conventions, the offline story.
3. After **Step 5**: replace `fixtures/` with generated clients against real contracts. The view models are designed to be deleted.
4. After the 360° integration decision: replace the tour placeholder with a real renderer, keeping the interaction model that survives review.

The other surfaces — public web listings, Owner web and mobile, Tenant web and mobile, Super Admin web — are not started, and starting one before Step 3 would be a second exception with none of the justification the first one had.
