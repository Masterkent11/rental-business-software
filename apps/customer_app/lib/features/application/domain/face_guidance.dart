import 'verification.dart';

class DetectedFacePose {
  const DetectedFacePose(
      {required this.centerX,
      required this.centerY,
      required this.widthRatio,
      required this.yaw,
      required this.pitch,
      required this.roll});
  final double centerX;
  final double centerY;
  final double widthRatio;
  final double? yaw;
  final double? pitch;
  final double? roll;
}

abstract final class FaceGuidance {
  static String? problem(List<DetectedFacePose> faces, FaceInstruction instruction) {
    if (faces.isEmpty) return 'Position your face in the guide.';
    if (faces.length > 1) return 'Only one person should be in view.';
    final face = faces.single;
    if (face.widthRatio < .22) return 'Move a little closer.';
    if (face.widthRatio > .8) return 'Move a little farther away.';
    if (face.centerX < .25 || face.centerX > .75 || face.centerY < .2 || face.centerY > .8) {
      return 'Center your face in the guide.';
    }
    final yaw = face.yaw;
    final pitch = face.pitch;
    if (yaw == null || pitch == null) return 'Keep your face visible in good lighting.';
    // Raw camera yaw is reversed relative to the mirrored front-camera preview.
    final matches = switch (instruction) {
      FaceInstruction.align => yaw.abs() < 10 && pitch.abs() < 10 && (face.roll?.abs() ?? 0) < 12,
      FaceInstruction.right => yaw < -12 && yaw > -38 && pitch.abs() < 18,
      FaceInstruction.left => yaw > 12 && yaw < 38 && pitch.abs() < 18,
      FaceInstruction.up => pitch > 12 && pitch < 35 && yaw.abs() < 15,
    };
    return matches ? null : instruction.description;
  }
}
