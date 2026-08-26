import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'panorama_source.dart';

/// Where the customer is looking.
///
/// Yaw wraps — you can turn all the way round. Pitch is clamped, because
/// looking past straight up should stop, not flip you over backwards.
@immutable
class PanoramaCamera {
  const PanoramaCamera({this.yaw = 0, this.pitch = 0, this.fov = _defaultFov});

  static const double _defaultFov = 75 * math.pi / 180;
  static const double minFov = 30 * math.pi / 180;
  static const double maxFov = 100 * math.pi / 180;

  /// Radians.
  final double yaw;
  final double pitch;

  /// Vertical field of view. Narrower is more zoomed in.
  final double fov;

  static const double _maxPitch = math.pi / 2 - 0.01;

  PanoramaCamera copyWith({double? yaw, double? pitch, double? fov}) =>
      PanoramaCamera(
        yaw: _wrap(yaw ?? this.yaw),
        pitch: (pitch ?? this.pitch).clamp(-_maxPitch, _maxPitch),
        fov: (fov ?? this.fov).clamp(minFov, maxFov),
      );

  static double _wrap(double radians) {
    const twoPi = 2 * math.pi;
    var value = (radians + math.pi) % twoPi;
    if (value < 0) value += twoPi;
    return value - math.pi;
  }

  /// How zoomed in we are, 0 (widest) to 1 (tightest). Drives tile level.
  double get zoom => (maxFov - fov) / (maxFov - minFov);
}

/// The panorama itself: a shader, a texture, and two gestures.
///
/// The projection runs on the GPU. Reprojecting an equirectangular image in
/// Dart on every frame cannot hold a frame budget on the mid-range Android
/// phone this feature is for, and that phone is the whole point of the tour.
class PanoramaView extends StatefulWidget {
  const PanoramaView({
    required this.source,
    required this.camera,
    required this.onCameraChanged,
    this.onInteractionStart,
    super.key,
  });

  final PanoramaSource source;
  final PanoramaCamera camera;
  final ValueChanged<PanoramaCamera> onCameraChanged;
  final VoidCallback? onInteractionStart;

  @override
  State<PanoramaView> createState() => _PanoramaViewState();
}

class _PanoramaViewState extends State<PanoramaView> {
  ui.FragmentShader? _shader;

  /// Set when the GPU path cannot be used on this platform.
  ///
  /// Flutter web does not support image samplers in fragment shaders: the
  /// program compiles and loads, and then `setImageSampler` throws at paint
  /// time. Detecting that only at load time left the web build showing a black
  /// rectangle, so the failure is caught where it actually happens.
  bool _shaderFailed = false;

  double _startFov = 0;
  Offset _lastFocal = Offset.zero;

  @override
  void initState() {
    super.initState();
    _loadShader();
  }

  Future<void> _loadShader() async {
    try {
      final program = await ui.FragmentProgram.fromAsset(
        'shaders/panorama.frag',
      );
      if (!mounted) return;
      setState(() => _shader = program.fragmentShader());
    } catch (_) {
      // Some backends have no fragment-shader support at all.
      if (mounted) setState(() => _shaderFailed = true);
    }
  }

  /// Fall back to the flat projection, once.
  ///
  /// Called from the painter the first time the GPU path throws. A flat pan is
  /// geometrically wrong — verticals bow — but it shows the room, and showing
  /// the room beats a black rectangle.
  void _fallBackToFlat() {
    if (_shaderFailed || !mounted) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _shaderFailed = true);
    });
  }

  @override
  void dispose() {
    _shader?.dispose();
    super.dispose();
  }

  void _onScaleStart(ScaleStartDetails details) {
    widget.onInteractionStart?.call();
    _startFov = widget.camera.fov;
    _lastFocal = details.localFocalPoint;
  }

  void _onScaleUpdate(ScaleUpdateDetails details, Size size) {
    final delta = details.localFocalPoint - _lastFocal;
    _lastFocal = details.localFocalPoint;

    // Drag maps to rotation through the current field of view, so a swipe
    // turns you the same visual distance whether zoomed in or out.
    final perPixel = widget.camera.fov / size.height;

    widget.onCameraChanged(
      widget.camera.copyWith(
        yaw: widget.camera.yaw - delta.dx * perPixel,
        pitch: widget.camera.pitch + delta.dy * perPixel,
        // Pinching out widens the lens; the scale is inverted for that reason.
        fov: details.scale == 1.0 ? null : _startFov / details.scale,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Size(constraints.maxWidth, constraints.maxHeight);

        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onScaleStart: _onScaleStart,
          onScaleUpdate: (details) => _onScaleUpdate(details, size),
          child: AnimatedBuilder(
            animation: widget.source,
            builder: (context, _) {
              final image = widget.source.image;
              if (image == null) return const SizedBox.expand();

              return CustomPaint(
                size: size,
                isComplex: true,
                willChange: true,
                painter: _PanoramaPainter(
                  image: image,
                  camera: widget.camera,
                  shader: _shaderFailed ? null : _shader,
                  onShaderFailed: _fallBackToFlat,
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _PanoramaPainter extends CustomPainter {
  _PanoramaPainter({
    required this.image,
    required this.camera,
    required this.shader,
    required this.onShaderFailed,
  });

  final ui.Image image;
  final PanoramaCamera camera;
  final ui.FragmentShader? shader;
  final VoidCallback onShaderFailed;

  @override
  void paint(Canvas canvas, Size size) {
    final active = shader;

    if (active == null) {
      _paintFlat(canvas, size);
      return;
    }

    try {
      active
        ..setFloat(0, size.width)
        ..setFloat(1, size.height)
        ..setFloat(2, camera.yaw)
        ..setFloat(3, camera.pitch)
        ..setFloat(4, camera.fov)
        ..setImageSampler(0, image);

      canvas.drawRect(Offset.zero & size, Paint()..shader = active);
    } catch (_) {
      // The platform accepted the program but not an image sampler. Draw the
      // room the other way and stop trying the GPU path.
      onShaderFailed();
      _paintFlat(canvas, size);
    }
  }

  /// Fallback: pan across the equirectangular image without projecting it.
  ///
  /// Geometrically wrong — verticals bow — but it shows the room. Only used
  /// where fragment shaders are unavailable.
  void _paintFlat(Canvas canvas, Size size) {
    final scale = size.height / (image.height / 2);
    final width = image.width * scale;
    final offset = ((camera.yaw + math.pi) / (2 * math.pi)) * width;

    final paint = Paint()..filterQuality = FilterQuality.medium;
    for (final shift in [-width, 0.0, width]) {
      canvas.drawImageRect(
        image,
        Offset.zero & Size(image.width.toDouble(), image.height.toDouble()),
        Rect.fromLTWH(-offset + shift, 0, width, size.height),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_PanoramaPainter old) =>
      old.image != image ||
      old.camera.yaw != camera.yaw ||
      old.camera.pitch != camera.pitch ||
      old.camera.fov != camera.fov ||
      old.shader != shader;
}

/// Where a hotspot lands on screen, or null when it is behind the camera.
///
/// The same projection the shader does, in Dart, for one point rather than a
/// million: hotspots are positioned by bearing, so they stay on the door as the
/// customer looks around.
Offset? projectHotspot({
  required double yawDegrees,
  required double pitchDegrees,
  required PanoramaCamera camera,
  required Size size,
}) {
  final yaw = yawDegrees * math.pi / 180;
  final pitch = pitchDegrees * math.pi / 180;

  // Direction of the hotspot in world space.
  //
  // y is +sin(pitch), not -sin(pitch): the shader samples the panorama with
  // v = acos(y)/PI, and v = 0 is the top of the equirectangular image. A door
  // above the horizon therefore needs a positive y, and getting this backwards
  // put every raised hotspot below the horizon instead of above it.
  final dir = [
    math.cos(pitch) * math.sin(yaw),
    math.sin(pitch),
    math.cos(pitch) * math.cos(yaw),
  ];

  // Rotate into camera space: inverse yaw, then inverse pitch.
  final cy = math.cos(-camera.yaw), sy = math.sin(-camera.yaw);
  final x1 = dir[0] * cy + dir[2] * sy;
  final z1 = -dir[0] * sy + dir[2] * cy;
  final y1 = dir[1];

  final cp = math.cos(-camera.pitch), sp = math.sin(-camera.pitch);
  final y2 = y1 * cp - z1 * sp;
  final z2 = y1 * sp + z1 * cp;

  // Behind the camera: not on screen at all.
  if (z2 <= 0.001) return null;

  final t = math.tan(camera.fov / 2);
  final aspect = size.width / size.height;

  final ndcX = (x1 / z2) / (t * aspect);
  final ndcY = (y2 / z2) / t;

  // Comfortably outside the viewport — skip rather than draw off-screen.
  if (ndcX.abs() > 1.6 || ndcY.abs() > 1.6) return null;

  return Offset(
    (ndcX + 1) / 2 * size.width,
    (1 - ndcY) / 2 * size.height,
  );
}
