# Flutter Toolchain

## Current verified workstation (2026-10-22)

Flutter 3.47.6 / Dart 3.13.5, Xcode 27.0 on macOS 27.0.1. The current pubspec supports Dart >=3.5.4 <4 and Flutter >=3.24.5 <4; the old upper-bound statements below are historical, not current enforcement. New environment/flavor commands and validation limits are in [environment-management](../environment-management.md). Development iOS Simulator build passed during the architecture audit. Android SDK is absent on this workstation. CI pins Flutter 3.47.6; production distribution remains a separate signing/release task.

## Historical baseline (2026-08-20)

The remainder records the original toolchain and dependency decisions; do not use it as a current installed-version assertion.

> **Status:** Written
> **Owner step:** Step 3+ — Frontend (started early, deliberately)
> **Last updated:** 2026-08-20
> **Depends on:** nothing in `docs/` — this is an environment record
> **Informs:** [customer-app.md](customer-app.md), and every future Flutter surface

The versions this project builds against, and why they are pinned rather than floated. **Read this before touching `pubspec.yaml`.**

---

## The pinned toolchain

| | Version | Notes |
|---|---|---|
| Flutter | **3.24.5** (stable, 2024-11-13) | Engine `a18df97ca5`, framework `dec2ee5c1f` |
| Dart | **3.5.4** | Bundled with the above |
| macOS | 13.0 Ventura (arm64) | The development machine |
| Xcode | 14.3.1 (14E300c) | Caps the iOS SDK at 16.4 |

This is the **installed, verified** toolchain. It is not the newest Flutter, and that is a deliberate state, not an oversight: the machine is not being upgraded, so the project targets what the machine has.

---

## Why exact pins, not carets

`flutter create` generates caret ranges (`^4.0.0`), which resolve to the newest compatible release at `pub get` time. On a current toolchain that is convenient. On a toolchain from November 2024 it is a trap:

```
   pubspec says:   go_router: ^14.2.7
   pub.dev has:    go_router  17.5.0   (requires Dart >= 3.6)
   pub get picks:  the newest thing whose constraints it can satisfy
                          │
                          ▼
   The failure surfaces at COMPILE time, in a file you did not write,
   with an error about a language feature — not at resolve time, and
   not pointing at the caret that caused it.
```

The same trap fires on a teammate's machine, in CI, or on a fresh clone months from now — anywhere the resolver runs with a different package index than it did today.

So:

1. **Every direct dependency is pinned to an exact version.** No carets, no ranges.
2. **`pubspec.lock` is committed.** Apps commit their lockfile; only reusable packages leave it out.
3. **The SDK constraint is upper-bounded**: `sdk: ">=3.5.4 <3.6.0"`, `flutter: ">=3.24.5 <3.25.0"`. The app should **refuse to build** on a newer toolchain rather than build differently on one. A loud failure beats a silent behaviour change.

## The pinned dependencies

| Package | Version | Why this one |
|---|---|---|
| `flutter_riverpod` | 2.5.1 | Last 2.x line verified against Dart 3.5. Riverpod 3.x requires a newer SDK |
| `go_router` | 14.2.7 | Predates the releases that raised the Dart floor above 3.5 |
| `intl` | 0.19.0 | The version Flutter 3.24.5's own `flutter_localizations` pins. Using anything else creates a conflict the moment localization is added |
| `cupertino_icons` | 1.0.8 | Bundled default |
| `flutter_lints` | 4.0.0 | Matches the analysis options this SDK generates |

Dependencies are kept few on purpose. Every package added now is a package that must be version-checked against a toolchain the rest of the ecosystem has moved past.

---

## What this toolchain can and cannot do

| Target | Status |
|---|---|
| Web (Chrome) | **Verified** — release build succeeds |
| macOS desktop | Available; the arm64 machine is a valid target |
| Android | Buildable; no emulator or device currently attached |
| iOS | Buildable in principle, **capped at the iOS 16.4 SDK** by Xcode 14.3.1, and no simulator is currently booted |

**The iOS constraint is the one to plan around.** Xcode 14.3.1 cannot build against iOS 17+ SDKs, and App Store submission requires a minimum Xcode version that moves upward over time. Shipping the customer app to the App Store will eventually require upgrading Xcode — which on macOS 13 means upgrading macOS first. That is a known future cost, not a present blocker, and it does not affect development, testing, Android, or web.

## Verifying the environment

```bash
flutter --version
```

Expect `Flutter 3.24.5` and `Dart 3.5.4`. If either differs, `pub get` will refuse rather than silently resolve differently — which is the whole point of the upper bounds.

```bash
cd apps/customer_app && flutter pub get && flutter analyze && flutter test
```

Clean analyzer, passing tests. That is the gate before any commit touching the app.

---

## Upgrading later, when it happens

Not now. When it does, the order matters:

1. Upgrade macOS, then Xcode, then Flutter — the iOS chain is what forces the sequence.
2. Raise the SDK bounds in `pubspec.yaml` **first**, deliberately, as a commit of its own.
3. Move dependencies one at a time, re-running `flutter test` between each. Bulk `pub upgrade --major-versions` turns five separate breakages into one unreadable one.
4. Re-verify the tour viewer specifically — it is the piece most exposed to rendering and gesture behaviour changes.
