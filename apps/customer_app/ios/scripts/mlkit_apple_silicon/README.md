# ML Kit Apple Silicon simulator compatibility

Unmodified upstream helper from flutter-ml/google_ml_kit_flutter, commit `108359333a05cfefe8f3515b6280d4804749be8d`:
https://github.com/flutter-ml/google_ml_kit_flutter/tree/108359333a05cfefe8f3515b6280d4804749be8d/packages/google_mlkit_commons/ios/scripts

Vendored under the included MIT license so the existing pinned Flutter plugins and native SDKs remain unchanged. Google's framework arm64 slices are device-labelled; the upstream helper relabels their Mach-O platform for each selected build SDK and removes only the simulator arm64 exclusion during pod installation. It does not replace OCR or face detection with mocks.

The Podfile loads this helper on every installation. Its generated build phase switches the framework labels back to iOS for physical-device builds. Do not run device and simulator builds concurrently against the same Pods directory. Removing the Podfile require/hook and reinstalling the affected ML Kit pods from their locked downloads restores the original binaries.
