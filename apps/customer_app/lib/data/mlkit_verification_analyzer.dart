import 'package:flutter/painting.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import '../features/application/domain/face_guidance.dart';
import '../features/application/domain/id_ocr_parser.dart';
import '../features/application/domain/verification.dart';

class MlKitVerificationAnalyzer {
  final _text = TextRecognizer(script: TextRecognitionScript.latin);
  final _faces = FaceDetector(
      options:
          FaceDetectorOptions(performanceMode: FaceDetectorMode.accurate, enableLandmarks: true, enableTracking: true));
  Future<IdOcrResult> readFront(InputImage image) async {
    final result = await _text.processImage(image);
    return IdOcrParser.parse([
      for (final block in result.blocks)
        for (final line in block.lines) OcrLine(line.text, line.confidence)
    ]);
  }

  Future<String?> faceProblem(InputImage image, Size uprightSize, FaceInstruction cue, {required bool mirrored}) async {
    final faces = await _faces.processImage(image);
    return FaceGuidance.problem([
      for (final face in faces)
        DetectedFacePose(
          centerX: face.boundingBox.center.dx / uprightSize.width,
          centerY: face.boundingBox.center.dy / uprightSize.height,
          widthRatio: face.boundingBox.width / uprightSize.width,
          yaw: mirrored && face.headEulerAngleY != null ? -face.headEulerAngleY! : face.headEulerAngleY,
          pitch: face.headEulerAngleX,
          roll: face.headEulerAngleZ,
        )
    ], cue);
  }

  Future<void> close() async {
    await _text.close();
    await _faces.close();
  }
}
