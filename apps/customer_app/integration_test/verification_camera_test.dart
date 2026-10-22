import 'package:camera/camera.dart';
import 'package:customer_app/data/mlkit_verification_analyzer.dart';
import 'package:customer_app/features/application/domain/verification.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_mlkit_commons/google_mlkit_commons.dart';
import 'package:integration_test/integration_test.dart';
import 'dart:io';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('real rear/front camera and native ML Kit inference', (tester) async {
    final cameras = await availableCameras();
    final analyzer = MlKitVerificationAnalyzer();
    try {
      for (final lens in [CameraLensDirection.back, CameraLensDirection.front]) {
        final camera = CameraController(cameras.firstWhere((c) => c.lensDirection == lens), ResolutionPreset.high,
            enableAudio: false);
        try {
          await camera.initialize();
          await tester.pumpWidget(MaterialApp(home: Scaffold(body: CameraPreview(camera))));
          await tester.pump();
          final file = await camera.takePicture();
          try {
            final input = InputImage.fromFilePath(file.path);
            if (lens == CameraLensDirection.back) {
              final result = await analyzer.readFront(input);
              expect(result.lineCount, greaterThanOrEqualTo(0));
            } else {
              await analyzer.faceProblem(input, const Size(720, 1280), FaceInstruction.align, mirrored: false);
            }
          } finally {
            await File(file.path).delete();
          }
        } finally {
          await tester.pumpWidget(const SizedBox());
          await camera.dispose();
        }
      }
    } finally {
      await analyzer.close();
    }
  }, timeout: const Timeout(Duration(minutes: 2)));
}
