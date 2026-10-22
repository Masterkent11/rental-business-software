import 'package:camera/camera.dart';
import 'package:camera_platform_interface/camera_platform_interface.dart' as platform;
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/application_repository.dart';
import 'package:customer_app/features/application/application_controller.dart';
import 'package:customer_app/features/application/domain/verification.dart';
import 'package:customer_app/features/application/identity_review_form.dart';
import 'package:customer_app/features/application/verification_camera_view.dart';
import 'package:customer_app/features/application/verification_result_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'verification_camera_test.dart' show TestCameraPlatform;
import 'verification_flow_test.dart' show MemoryVerification;

class PreviewCameraPlatform extends TestCameraPlatform {
  PreviewCameraPlatform() {
    denied = false;
  }
  @override
  Future<List<CameraDescription>> availableCameras() async => const [
        CameraDescription(name: 'rear', lensDirection: CameraLensDirection.back, sensorOrientation: 90),
        CameraDescription(name: 'front', lensDirection: CameraLensDirection.front, sensorOrientation: 90),
      ];
  @override
  Widget buildPreview(int cameraId) => const ColoredBox(color: Color(0xFF5B554B));
}

void main() {
  for (final cue in [null, ...FaceInstruction.values]) {
    testWidgets('full-screen camera composition for ${cue?.name ?? 'ID front'}', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      final previous = platform.CameraPlatform.instance;
      platform.CameraPlatform.instance = PreviewCameraPlatform();
      final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
      for (final name in ['google_mlkit_text_recognizer', 'google_mlkit_face_detector']) {
        messenger.setMockMethodCallHandler(MethodChannel(name), (_) async => null);
      }
      addTearDown(() async {
        await tester.pumpWidget(const SizedBox());
        await tester.pump();
        platform.CameraPlatform.instance = previous;
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      await tester.pumpWidget(MaterialApp(
          home: Scaffold(
              body: MediaQuery(
                  data: const MediaQueryData(size: Size(390, 844), disableAnimations: true),
                  child:
                      VerificationCameraView(busy: false, instruction: cue, onBack: () {}, onCapture: (_) async {})))));
      await tester.pumpAndSettle();
      expect(tester.getSize(find.byType(VerificationCameraView)), const Size(390, 844));
      expect(find.byType(AppBar), findsNothing);
      expect(find.text('Application details'), findsNothing);
      if (cue == null) {
        expect(find.text('Capture the front of your ID'), findsOneWidget);
        expect(find.text('Capture now'), findsNothing);
        expect(tester.getBottomRight(find.text("Hold steady. We'll capture automatically.")).dy, greaterThan(600));
      } else {
        expect(find.text(cue.title), findsOneWidget);
        expect(find.byType(LinearProgressIndicator), findsNothing);
      }
      expect(tester.takeException(), isNull);
    }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));
  }
  testWidgets('review uses the captured values and normalizes a displayed birth date', (tester) async {
    const details = IdentityDetails(
        fullName: 'Ana Santos', dateOfBirth: '1990-01-01', documentType: 'Passport', documentNumber: 'TEST-123');
    IdentityDetails? confirmed;
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: IdentityReviewForm(
                session: VerificationSession(
                    id: 's1',
                    draftId: 'd1',
                    status: VerificationStatus.ocrReview,
                    expiresAt: DateTime(2099),
                    extracted: details),
                busy: false,
                onConfirm: (value) => confirmed = value,
                onRecapture: () {}))));
    expect(find.text('01 Jan 1990'), findsOneWidget);
    await tester.tap(find.text('Continue'));
    await tester.pump();
    expect(confirmed?.dateOfBirth, '1990-01-01');
    expect(confirmed?.documentNumber, 'TEST-123');
    expect(tester.takeException(), isNull);
  });
  testWidgets('completion animation advances an authoritative result without submitting', (tester) async {
    final server = MemoryVerification()..serverStatus = VerificationStatus.verified;
    final api = ApiClient(baseUrl: 'http://test');
    final controller =
        ApplicationFlowController(server, ApplicationRepository(api), 'r1', () => DateTime(2026, 10, 21));
    addTearDown(() {
      controller.dispose();
      api.close();
    });
    await tester.runAsync(() => Future<void>.delayed(Duration.zero));
    await tester.runAsync(controller.continueToVerification);
    expect(controller.state.step, ApplicationStep.verification);
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: VerificationResultView(
                verified: true,
                onBack: () {},
                onRefresh: () {},
                onComplete: controller.finishVerificationPresentation))));
    await tester.pumpAndSettle();
    expect(controller.state.step, ApplicationStep.review);
    expect(controller.state.applicationId, isNull);
  });
}
