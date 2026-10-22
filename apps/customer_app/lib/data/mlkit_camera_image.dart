import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_commons/google_mlkit_commons.dart';

InputImage? mlKitCameraImage(CameraImage image, CameraController camera) {
  if (image.planes.length != 1) return null;
  final format = InputImageFormatValue.fromRawValue(image.format.raw);
  if (Platform.isIOS && format != InputImageFormat.bgra8888) return null;
  if (Platform.isAndroid && format != InputImageFormat.nv21) return null;
  const orientations = {
    DeviceOrientation.portraitUp: 0,
    DeviceOrientation.landscapeLeft: 90,
    DeviceOrientation.portraitDown: 180,
    DeviceOrientation.landscapeRight: 270
  };
  var degrees = camera.description.sensorOrientation;
  if (Platform.isAndroid) {
    final offset = orientations[camera.value.deviceOrientation]!;
    degrees = camera.description.lensDirection == CameraLensDirection.front
        ? (degrees + offset) % 360
        : (degrees - offset + 360) % 360;
  }
  final rotation = InputImageRotationValue.fromRawValue(degrees);
  if (format == null || rotation == null) return null;
  return InputImage.fromBytes(
      bytes: image.planes.first.bytes,
      metadata: InputImageMetadata(
          size: Size(image.width.toDouble(), image.height.toDouble()),
          rotation: rotation,
          format: format,
          bytesPerRow: image.planes.first.bytesPerRow));
}

Size uprightImageSize(CameraImage image, CameraController camera) {
  if (Platform.isIOS) return Size(image.width.toDouble(), image.height.toDouble());
  final input = mlKitCameraImage(image, camera);
  final rotation = input?.metadata?.rotation;
  return rotation == InputImageRotation.rotation90deg || rotation == InputImageRotation.rotation270deg
      ? Size(image.height.toDouble(), image.width.toDouble())
      : Size(image.width.toDouble(), image.height.toDouble());
}
