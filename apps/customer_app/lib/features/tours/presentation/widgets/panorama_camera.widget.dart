import 'dart:math' as math;
import 'package:flutter/material.dart';

class PanoramaCamera {
  const PanoramaCamera({
    this.yaw = 0.0,
    this.pitch = 0.0,
    this.fov = maxFov,
  });

  final double yaw;
  final double pitch;
  final double fov;

  static const double minFov = 0.5;
  static const double maxFov = 1.6;

  double get zoom => (maxFov - fov) / (maxFov - minFov);

  PanoramaCamera copyWith({
    double? yaw,
    double? pitch,
    double? fov,
  }) {
    double nextYaw = yaw ?? this.yaw;
    while (nextYaw > math.pi) {
      nextYaw -= 2 * math.pi;
    }
    while (nextYaw < -math.pi) {
      nextYaw += 2 * math.pi;
    }

    double nextPitch = pitch ?? this.pitch;
    nextPitch = nextPitch.clamp(-math.pi / 2.2, math.pi / 2.2);

    double nextFov = fov ?? this.fov;
    nextFov = nextFov.clamp(minFov, maxFov);

    return PanoramaCamera(
      yaw: nextYaw,
      pitch: nextPitch,
      fov: nextFov,
    );
  }
}

Offset? projectHotspot({
  required double yawDegrees,
  required double pitchDegrees,
  required PanoramaCamera camera,
  required Size size,
}) {
  final targetYaw = yawDegrees * math.pi / 180.0;
  final targetPitch = pitchDegrees * math.pi / 180.0;

  double deltaYaw = targetYaw - camera.yaw;
  while (deltaYaw > math.pi) {
    deltaYaw -= 2 * math.pi;
  }
  while (deltaYaw < -math.pi) {
    deltaYaw += 2 * math.pi;
  }

  // If hotspot is behind the camera (outside [-pi/2, pi/2]), hide it.
  if (deltaYaw.abs() > math.pi / 2) return null;

  final deltaPitch = targetPitch - camera.pitch;

  final halfFov = camera.fov / 2;
  final dx = size.width / 2 + (deltaYaw / halfFov) * (size.width / 2);
  final dy = size.height / 2 - (deltaPitch / halfFov) * (size.height / 2);

  return Offset(dx, dy);
}
