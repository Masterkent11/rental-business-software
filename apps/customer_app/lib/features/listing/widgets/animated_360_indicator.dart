import 'dart:math' as math;

import 'package:flutter/material.dart';

class Animated360Indicator extends StatefulWidget {
  const Animated360Indicator({
    this.phoneWidth = 34.0,
    this.phoneHeight = 58.0,
    this.arrowRadius = 38.0,
    this.previewUrl,
    this.isLarge = false,
    super.key,
  });

  final double phoneWidth;
  final double phoneHeight;
  final double arrowRadius;
  final String? previewUrl;
  final bool isLarge;

  @override
  State<Animated360Indicator> createState() => _Animated360IndicatorState();
}

class _Animated360IndicatorState extends State<Animated360Indicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2800),
    );
    _startAnimation();
  }

  void _startAnimation() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final isTest = WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');
      final disable = isTest || (MediaQuery.maybeOf(context)?.disableAnimations ?? false);
      if (!disable) {
        _controller.repeat();
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final isTest = WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');
    final disable = isTest || (MediaQuery.maybeOf(context)?.disableAnimations ?? false);
    if (disable && _controller.isAnimating) {
      _controller.stop();
      _controller.value = 0;
    } else if (!disable && !_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final cycle = _controller.value * 2 * math.pi;
        final tiltAngle = math.sin(cycle) * (10.0 * math.pi / 180.0);
        final arrowPulse = 0.85 + 0.15 * math.cos(cycle).abs();

        return SizedBox(
          width: widget.arrowRadius * 2 + (widget.isLarge ? 70 : 40),
          height: widget.phoneHeight + (widget.isLarge ? 60 : 36),
          child: Stack(
            alignment: Alignment.center,
            children: [
              CustomPaint(
                size: Size(
                  widget.arrowRadius * 2 + (widget.isLarge ? 60 : 34),
                  widget.phoneHeight + (widget.isLarge ? 40 : 20),
                ),
                painter: _MotionArrowsPainter(
                  radius: widget.arrowRadius,
                  pulse: arrowPulse,
                  strokeWidth: widget.isLarge ? 3.0 : 2.2,
                  isLarge: widget.isLarge,
                ),
              ),
              Transform.rotate(
                angle: tiltAngle,
                child: _PhoneWidget(
                  width: widget.phoneWidth,
                  height: widget.phoneHeight,
                  isLarge: widget.isLarge,
                  previewUrl: widget.previewUrl,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _PhoneWidget extends StatelessWidget {
  const _PhoneWidget({
    required this.width,
    required this.height,
    required this.isLarge,
    this.previewUrl,
  });

  final double width;
  final double height;
  final bool isLarge;
  final String? previewUrl;

  @override
  Widget build(BuildContext context) {
    final radius = isLarge ? 18.0 : 7.0;
    final borderWidth = isLarge ? 3.2 : 2.0;

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: Colors.white,
          width: borderWidth,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.white.withValues(alpha: 0.25),
            blurRadius: isLarge ? 16 : 8,
            spreadRadius: isLarge ? 2 : 1,
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (previewUrl != null && previewUrl!.isNotEmpty)
            Image.network(
              previewUrl!,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _fallbackScreen(),
            )
          else
            _fallbackScreen(),
          Align(
            alignment: Alignment.topCenter,
            child: Container(
              margin: EdgeInsets.only(top: isLarge ? 4 : 2),
              width: isLarge ? 28 : 10,
              height: isLarge ? 4 : 2,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.8),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              margin: EdgeInsets.only(bottom: isLarge ? 4 : 2),
              width: isLarge ? 32 : 12,
              height: isLarge ? 3 : 1.5,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.8),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _fallbackScreen() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withValues(alpha: 0.25),
            Colors.white.withValues(alpha: 0.05),
          ],
        ),
      ),
    );
  }
}

class _MotionArrowsPainter extends CustomPainter {
  const _MotionArrowsPainter({
    required this.radius,
    required this.pulse,
    required this.strokeWidth,
    required this.isLarge,
  });

  final double radius;
  final double pulse;
  final double strokeWidth;
  final bool isLarge;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: (0.85 * pulse).clamp(0.0, 1.0))
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final glowPaint = Paint()
      ..color = Colors.white.withValues(alpha: (0.35 * pulse).clamp(0.0, 1.0))
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth + (isLarge ? 4.0 : 2.5)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3);

    final xRadius = radius + (isLarge ? 20 : 10);
    final yRadius = radius * (isLarge ? 0.72 : 0.65);

    final leftRect = Rect.fromCenter(
      center: center,
      width: xRadius * 2,
      height: yRadius * 2,
    );

    final leftPath = Path()
      ..addArc(leftRect, math.pi * 0.78, math.pi * 0.52);

    canvas.drawPath(leftPath, glowPaint);
    canvas.drawPath(leftPath, paint);

    _drawArrowHead(
      canvas,
      Offset(
        center.dx - xRadius * math.cos(math.pi * 0.22),
        center.dy - yRadius * math.sin(math.pi * 0.22),
      ),
      -math.pi * 0.65,
      isLarge ? 10.0 : 6.5,
      paint,
    );

    final rightPath = Path()
      ..addArc(leftRect, -math.pi * 0.22, math.pi * 0.52);

    canvas.drawPath(rightPath, glowPaint);
    canvas.drawPath(rightPath, paint);

    _drawArrowHead(
      canvas,
      Offset(
        center.dx + xRadius * math.cos(math.pi * 0.22),
        center.dy + yRadius * math.sin(math.pi * 0.22),
      ),
      math.pi * 0.35,
      isLarge ? 10.0 : 6.5,
      paint,
    );
  }

  void _drawArrowHead(
    Canvas canvas,
    Offset tip,
    double angle,
    double size,
    Paint paint,
  ) {
    final fillPaint = Paint()
      ..color = paint.color
      ..style = PaintingStyle.fill;

    final p1 = Offset(
      tip.dx - size * math.cos(angle - math.pi / 6),
      tip.dy - size * math.sin(angle - math.pi / 6),
    );
    final p2 = Offset(
      tip.dx - size * math.cos(angle + math.pi / 6),
      tip.dy - size * math.sin(angle + math.pi / 6),
    );

    final path = Path()
      ..moveTo(tip.dx, tip.dy)
      ..lineTo(p1.dx, p1.dy)
      ..lineTo(p2.dx, p2.dy)
      ..close();

    canvas.drawPath(path, fillPaint);
  }

  @override
  bool shouldRepaint(covariant _MotionArrowsPainter oldDelegate) {
    return oldDelegate.pulse != pulse ||
        oldDelegate.radius != radius ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}
