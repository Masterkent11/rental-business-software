# iOS simulator build repair — 21 October 2026

## Root cause

The exact iPhone 18 Pro Max / iOS 27.0 destination failed before the repair. A generic simulator query exposed the underlying architecture mismatch:

```text
ARCHS = x86_64
EXCLUDED_ARCHS = i386 arm64
SUPPORTED_PLATFORMS = iphoneos iphonesimulator
```

The `arm64` exclusion originates in Google's `MLKitCommon` 12.0.0, `MLKitVision` 8.0.0, and `MLImage` 1.0.0-beta5 podspecs. Their generated CocoaPods settings reach Runner through its xcconfig includes. The arm64 objects in these SDKs are device-labelled, while their simulator slice is x86_64. Removing an exclusion alone would leave the arm64 device/simulator linker mismatch.

`SDKROOT = iphoneos` was not itself the Debug failure: `-sdk iphonesimulator` selects the simulator SDK, and Debug already effectively supported both platforms. Release and Profile explicitly restricted supported platforms to devices; those restrictions were corrected as well. Profile also used `Flutter/Release.xcconfig`, inheriting the Release CocoaPods settings instead of Profile settings.

## Repair and files

- `ios/Podfile`: load the vendored upstream ML Kit Apple Silicon compatibility helper and call it from the existing post-install hook.
- `ios/scripts/mlkit_apple_silicon/apple_silicon_simulator.rb` and `patch_arm64_simulator.py`: unmodified upstream helper pinned to commit `108359333a05cfefe8f3515b6280d4804749be8d`. Its persistent installation hook removes the ML Kit simulator arm64 exclusion and installs a per-build phase that relabels ML Kit arm64 object platform metadata for the selected SDK. It does not change machine instructions or substitute OCR/face-detection implementations.
- `ios/scripts/mlkit_apple_silicon/LICENSE` and `README.md`: upstream MIT license, provenance, switching/reversal instructions.
- `ios/Runner.xcodeproj/project.pbxproj`: support `iphoneos iphonesimulator` in all three project configurations and use a dedicated Profile xcconfig. Signing, identifiers, permissions, and deployment target remain unchanged.
- `ios/Flutter/Profile.xcconfig`: include `Pods-Runner.profile.xcconfig` and `Generated.xcconfig`.
- `ios/Podfile.lock`: regenerated Podfile checksum only; native SDK and plugin versions did not change.
- `integration_test/mlkit_native_test.dart`: real native OCR, positive face-detection fixture, and camera enumeration checks.
- This report.

All pre-existing staged changes were preserved. No commit or push was performed. No environment file was changed.

Upstream source and rationale: [ML Kit plugin simulator helper](https://github.com/flutter-ml/google_ml_kit_flutter/tree/108359333a05cfefe8f3515b6280d4804749be8d/packages/google_mlkit_commons/ios/scripts), [plugin documentation](https://github.com/flutter-ml/google_ml_kit_flutter/blob/108359333a05cfefe8f3515b6280d4804749be8d/packages/google_mlkit_commons/README.md#apple-silicon-ios-simulator-ios-26).

## Effective configuration

| Setting | Before | After |
| --- | --- | --- |
| Exact simulator destination | Rejected | Accepted |
| Debug simulator ARCHS | x86_64 | arm64 |
| Debug simulator EXCLUDED_ARCHS | i386 arm64 | i386 |
| Selected SDK | iphonesimulator27.0 | iphonesimulator27.0 |
| Debug supported platforms | iphoneos iphonesimulator | iphoneos iphonesimulator |
| Release/Profile supported platforms | iphoneos | iphoneos iphonesimulator |
| Deployment target | 15.5 | 15.5 |
| Profile base configuration | Release.xcconfig | Profile.xcconfig |

No global ARCHS override was added. The base SDK setting remains `iphoneos`; simulator selection occurs through Xcode's selected SDK/destination.

## Commands and results

From `apps/customer_app`, completed in the requested order:

```sh
flutter pub get
flutter clean
flutter pub get
(cd ios && pod install)
```

The following exact destination query passed:

```sh
cd ios
xcodebuild -workspace Runner.xcworkspace -scheme Runner -configuration Debug \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,id=A9AC2B49-8CE5-49A8-B84A-94F398FE80DD' \
  -showBuildSettings
```

| Verification | Result |
| --- | --- |
| `flutter build ios --simulator --debug` | PASS; built Runner.app |
| `flutter run -d A9AC2B49-8CE5-49A8-B84A-94F398FE80DD` | PASS; application launched, Dart VM service connected, Supabase initialization completed |
| `flutter analyze lib test integration_test test_driver` | PASS; no issues |
| `flutter test --reporter expanded` | PASS; 297 tests |
| Native integration test on the exact simulator | PASS; OCR recognized generated document text, face detection found one face, camera plugin enumerated capabilities |
| Development backend `/health` | PASS; HTTP 200 |
| New password sign-in / live final submission | NOT TESTED; existing auth and flow regression tests passed |
| Physical-camera capture during this repair | NOT TESTED; simulator inference checks do not establish physical camera functionality |
| Device build / original binary restoration | PASS; unsigned release Runner.app built (113.5 MB); all six framework SHA-256 hashes restored exactly to their original values |

The native test used:

```sh
flutter drive --driver=test_driver/verification_driver.dart \
  --target=integration_test/mlkit_native_test.dart \
  -d A9AC2B49-8CE5-49A8-B84A-94F398FE80DD --no-uninstall-first \
  --dart-define=MLKIT_FACE_FIXTURE_URL=http://127.0.0.1:18082/face.png
```

A temporary loopback-only server supplied an existing reference face image to the test. To reproduce the fixture test, serve `assets/WeStayPlace_Verification_Assets/reference/exact_crops` with `python3 -m http.server 18082 --bind 127.0.0.1 --directory assets/WeStayPlace_Verification_Assets/reference/exact_crops`, and set `MLKIT_FACE_FIXTURE_URL=http://127.0.0.1:18082/face_pose_neutral_preview_2x.png` in the drive command. It was not added to production assets. Generated OCR and downloaded face images were deleted after inference. This tests native inference execution, not document authenticity, biometric matching, or spoof-resistant liveness.

## Dependency integration and limits

Mixed CocoaPods/SPM integration is preserved. Supported plugins remain in Flutter's generated Swift package; app_links and the three ML Kit plugins remain on CocoaPods. The CocoaPods custom-base-configuration warning did not recur after adding the Profile include. CocoaPods 1.15.2 still produces Flutter's recommendation to use 1.16.2+, and Flutter warns that four plugins do not yet support SPM. Neither warning blocked these builds.

The simulator support is an upstream compatibility workaround for Google's missing arm64 simulator binaries, not an officially published Google simulator slice. Build device and simulator targets sequentially against the same Pods directory: the helper changes generated binary metadata for the selected SDK. Physical camera permissions and live capture still need physical hardware testing; the existing physical camera test was not rerun in this repair. The existing unavailable server identity-decision adapter is unchanged.

Evidence logs are under `/private/tmp/wsp-sim-`: `before-settings.log`, `before-generic.log`, `after-settings.log`, `pod-install.log`, `build.log`, `run.log`, `native-tests.log`, `flutter-tests.log`, `analyze.log`, and `device-regression.log`.
