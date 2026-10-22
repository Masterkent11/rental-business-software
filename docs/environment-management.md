# Flutter environment management

`apps/customer_app/lib/app/app_config.dart` is the typed public configuration boundary. Bootstrap validates before initializing Supabase. The API client reads the same compile-time API address; there is no local API or Supabase project fallback. Missing/unknown APP_ENV is an error. Supported names and native flavors: `development`, `staging`, `production`.

| Define | Purpose |
|---|---|
| APP_ENV | Exact environment/flavor name |
| API_BASE_URL | Absolute HTTP(S) API address; no credentials/query/fragment |
| SUPABASE_URL | Project URL |
| SUPABASE_PUBLISHABLE_KEY | Publishable key; legacy JWT accepted only with `role=anon` |

These values are extractable from builds. Never supply service-role/secret keys, signing keys, database credentials, payment secrets, or webhook secrets. Secret-pattern checks are a limited guard, not a complete secret scanner. Supabase key guidance: https://supabase.com/docs/guides/api/api-keys.

Copy the appropriate tracked `config/<environment>.example.json` to `config/<environment>.local.json` and replace placeholders with your project's public settings. Local files are ignored. Examples deliberately cannot connect to a real project. Backend APP_ENV currently accepts development/demo/test/production, so use backend `demo` for a staging deployment until its configuration contract is deliberately expanded; do not silently pass `staging` to the API.

From `apps/customer_app`:

```sh
flutter run --flavor development --dart-define-from-file=config/development.local.json
flutter run --flavor staging --dart-define-from-file=config/staging.local.json
flutter run --flavor production --dart-define-from-file=config/production.local.json
flutter test test/build_config_test.dart --dart-define-from-file=config/production.local.json
flutter build ios --simulator --debug --flavor development --dart-define-from-file=config/development.local.json
flutter build apk --debug --flavor development --dart-define-from-file=config/development.local.json
```

Staging/production require HTTPS in all modes; all release/profile builds require HTTPS. Production rejects common private/loopback hosts. A native flavor must match APP_ENV. This detects accidental configuration mismatch; it is not server authentication or an endpoint allowlist.

Local networking: iOS Simulator uses `http://localhost:8080`; Android Emulator uses `http://10.0.2.2:8080`. Physical devices need a reachable development host or trusted HTTPS tunnel, supplied in the ignored file. Allow Camera and Local Network when prompted, bind the API to an appropriate interface, and verify `/health`. Never put a developer's LAN address into tracked config. The development Android manifest explicitly permits cleartext for emulator/local networking; staging and production do not inherit that exception. iOS ATS still applies independently of Dart validation.

Android identifiers preserve `com.rentalplatform.customer_app` in production and append `.development`/`.staging` for other flavors. iOS preserves `com.rentalplatform.rentala` and appends the same suffixes. Original Runner scheme/configurations remain. Flavor xcconfigs include matching CocoaPods configuration plus Generated.xcconfig; production development-team/signing settings were copied unchanged. **Existing Android release signing uses the debug key; distribution remains blocked until proper release signing is configured by the project owner.** No store release or signing-key change is part of this task.

CI (`.github/workflows/quality.yml`) runs synthetic public example validation and unsigned simulator builds; it does not connect to real Supabase, publish artifacts, or deploy. Configure repository-protected staging/production environments and inject public configuration when enabling real release pipelines. Repository environment protections cannot be created by a YAML declaration alone. Android SDK is unavailable on this workstation; Android native build validation is pending. CI Android and signed production release jobs remain to be added after that toolchain/signing configuration is confirmed.

For iOS flavor setup conventions see https://docs.flutter.dev/deployment/flavors-ios; Android: https://docs.flutter.dev/deployment/flavors.
