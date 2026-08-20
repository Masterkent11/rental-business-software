# Customer App

The Flutter app for the **Customer** surface: discover, tour, book, apply.

```bash
flutter pub get
flutter run -d chrome     # or: -d macos
```

## Before you change anything

| Read this | For |
|---|---|
| [docs/06-frontend/flutter-toolchain.md](../../docs/06-frontend/flutter-toolchain.md) | **Why every dependency is pinned exactly.** Do not add a caret |
| [docs/06-frontend/customer-app.md](../../docs/06-frontend/customer-app.md) | What this app may and may not contain |
| [docs/03-domain/](../../docs/03-domain/) | The domain model. This app does not implement it |

Pinned to **Flutter 3.24.5 / Dart 3.5.4**. The SDK constraint is upper-bounded on purpose: the app refuses to build on a newer toolchain rather than building differently on one.

## The boundary

This is a **shell**. It has routing, a design system, screens, and fixture data. It has no domain rules, no availability logic, no API client, and no authentication — those wait for Steps 3 and 5.

Most importantly: **the app never computes availability.** Availability arrives as copy the server already decided. There is exactly one occupancy timeline per resource, and it lives server-side.

If the app and the documents disagree, the documents win.

## Gate before committing

```bash
flutter analyze && flutter test
```
