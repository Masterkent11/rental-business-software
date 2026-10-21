import 'dart:io';
import 'dart:ui' as ui;
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:http/http.dart' as http;
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('native OCR recognizes generated document text', (tester) async {
    final directory = await Directory.systemTemp.createTemp('wsp-mlkit-');
    final recognizer = TextRecognizer(script: TextRecognitionScript.latin);
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder)..drawColor(Colors.white, BlendMode.src);
    final painter = TextPainter(
        text: const TextSpan(
            text: 'WESTAYPLACE\nPASSPORT\nFULL NAME: TEST USER\nID NUMBER: TEST1234',
            style: TextStyle(color: Colors.black, fontSize: 54, height: 1.6)),
        textDirection: TextDirection.ltr)
      ..layout(maxWidth: 950);
    painter.paint(canvas, const Offset(30, 30));
    final picture = recorder.endRecording();
    final image = await picture.toImage(1000, 500);
    try {
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      final file = File('${directory.path}/document.png');
      await file.writeAsBytes(data!.buffer.asUint8List());
      final result = await recognizer.processImage(InputImage.fromFilePath(file.path));
      expect(result.text.toUpperCase(), contains('WESTAYPLACE'));
      expect(result.text.toUpperCase(), contains('TEST1234'));
      expect(result.blocks.expand((block) => block.lines).length, greaterThanOrEqualTo(4));
    } finally {
      image.dispose();
      picture.dispose();
      painter.dispose();
      await recognizer.close();
      await directory.delete(recursive: true);
    }
  });

  const fixtureUrl = String.fromEnvironment('MLKIT_FACE_FIXTURE_URL');
  testWidgets('native face detector recognizes a supplied test fixture', (tester) async {
    final directory = await Directory.systemTemp.createTemp('wsp-face-');
    final detector = FaceDetector(options: FaceDetectorOptions(performanceMode: FaceDetectorMode.accurate));
    try {
      final response = await http.get(Uri.parse(fixtureUrl));
      expect(response.statusCode, 200);
      final file = File('${directory.path}/face.png');
      await file.writeAsBytes(response.bodyBytes);
      final faces = await detector.processImage(InputImage.fromFilePath(file.path));
      expect(faces, hasLength(1));
      expect(faces.single.boundingBox.width, greaterThan(0));
      expect(faces.single.headEulerAngleY, isNotNull);
    } finally {
      await detector.close();
      await directory.delete(recursive: true);
    }
  }, skip: fixtureUrl.isEmpty);

  testWidgets('native camera plugin enumerates simulator capabilities', (tester) async {
    expect(await availableCameras(), isA<List<CameraDescription>>());
  });
}
