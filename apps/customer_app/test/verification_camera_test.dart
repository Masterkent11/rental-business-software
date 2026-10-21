import 'package:camera/camera.dart';
import 'package:camera_platform_interface/camera_platform_interface.dart' as platform;
import 'package:customer_app/data/device_verification_camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

class TestCameraPlatform extends platform.CameraPlatform {
  bool denied = true;
  int created = 0;
  int released = 0;
  @override
  Future<List<CameraDescription>> availableCameras() async =>
      const [CameraDescription(name: 'rear', lensDirection: CameraLensDirection.back, sensorOrientation: 90)];
  @override
  Stream<platform.DeviceOrientationChangedEvent> onDeviceOrientationChanged() => const Stream.empty();
  @override
  Future<int> createCameraWithSettings(CameraDescription description, platform.MediaSettings settings) async {
    created++;
    if (denied) throw CameraException('CameraAccessDenied', 'Denied');
    return 1;
  }

  @override
  Stream<platform.CameraInitializedEvent> onCameraInitialized(int id) =>
      Stream.value(platform.CameraInitializedEvent(id, 640, 480, ExposureMode.auto, true, FocusMode.auto, true));
  @override
  Future<void> initializeCamera(int id, {ImageFormatGroup imageFormatGroup = ImageFormatGroup.unknown}) async {}
  @override
  Stream<platform.CameraImageData> onStreamedFrameAvailable(int cameraId,
          {platform.CameraImageStreamOptions? options}) =>
      const Stream.empty();
  @override
  Future<void> dispose(int id) async {
    released++;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('permission denial can recover, and close releases the reopened camera', () async {
    final previous = platform.CameraPlatform.instance;
    final fake = TestCameraPlatform();
    platform.CameraPlatform.instance = fake;
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(const MethodChannel('google_mlkit_text_recognizer'), (_) async => null);
    messenger.setMockMethodCallHandler(const MethodChannel('google_mlkit_face_detector'), (_) async => null);
    final driver = DeviceVerificationCamera();
    try {
      await driver.open();
      expect(driver.error, contains('Camera access'));
      expect(driver.controller, isNull);
      fake.denied = false;
      await driver.open();
      expect(driver.error, isNull);
      expect(driver.controller?.value.isInitialized, isTrue);
      final releases = fake.released;
      await driver.close();
      expect(driver.controller, isNull);
      expect(fake.released, releases + 1);
    } finally {
      driver.dispose();
      await Future<void>.delayed(Duration.zero);
      platform.CameraPlatform.instance = previous;
      debugDefaultTargetPlatformOverride = null;
      messenger.setMockMethodCallHandler(const MethodChannel('google_mlkit_text_recognizer'), null);
      messenger.setMockMethodCallHandler(const MethodChannel('google_mlkit_face_detector'), null);
    }
  });
}
