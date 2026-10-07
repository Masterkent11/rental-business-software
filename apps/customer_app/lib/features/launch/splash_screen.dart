import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../design/tokens.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({this.onDone, super.key});

  final VoidCallback? onDone;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  static const Duration _totalDuration = Duration(milliseconds: 2700);

  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: _totalDuration,
  );

  bool _doneNotified = false;

  late final Animation<double> _houseEntrance = CurvedAnimation(
    parent: _controller,
    curve: const Interval(0.055, 0.241, curve: Tokens.ease),
  );

  late final Animation<double> _orbitProgress = CurvedAnimation(
    parent: _controller,
    curve: const Interval(0.111, 0.556, curve: Curves.easeInOutCubic),
  );

  late final Animation<double> _titleEntrance = CurvedAnimation(
    parent: _controller,
    curve: const Interval(0.204, 0.370, curve: Tokens.ease),
  );

  late final Animation<double> _locationEntrance = CurvedAnimation(
    parent: _controller,
    curve: const Interval(0.278, 0.426, curve: Tokens.ease),
  );

  late final Animation<double> _loadingTextEntrance = CurvedAnimation(
    parent: _controller,
    curve: const Interval(0.333, 0.481, curve: Tokens.ease),
  );

  late final Animation<double> _bottomProgress = CurvedAnimation(
    parent: _controller,
    curve: const Interval(0.352, 0.815, curve: Curves.easeInOutCubic),
  );

  late final Animation<double> _exitFade = CurvedAnimation(
    parent: _controller,
    curve: const Interval(0.907, 1.000, curve: Tokens.ease),
  );

  late final Animation<double> _bgScale = Tween<double>(
    begin: 1.02,
    end: 1.0,
  ).animate(
    CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOut,
    ),
  );

  @override
  void initState() {
    super.initState();
    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _notifyDone();
      }
    });
    _controller.forward();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    precacheImage(
      const AssetImage('assets/images/splash/rental_splash_background.png'),
      context,
    );
    final reduceMotion =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (reduceMotion && _controller.duration != const Duration(milliseconds: 300)) {
      _controller.duration = const Duration(milliseconds: 300);
      if (!_controller.isCompleted) {
        _controller.forward(from: _controller.value);
      }
    }
  }

  void _notifyDone() {
    if (_doneNotified) return;
    _doneNotified = true;
    widget.onDone?.call();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.sizeOf(context);
    final reduceMotion =
        MediaQuery.maybeOf(context)?.disableAnimations ?? false;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFF0A0F1D),
        body: Stack(
          fit: StackFit.expand,
          children: [
            AnimatedBuilder(
              animation: _bgScale,
              builder: (context, child) {
                final scale = reduceMotion ? 1.0 : _bgScale.value;
                return Transform.scale(
                  scale: scale,
                  child: child,
                );
              },
              child: Image.asset(
                'assets/images/splash/rental_splash_background.png',
                fit: BoxFit.cover,
                gaplessPlayback: true,
                errorBuilder: (context, error, stackTrace) => const SizedBox.expand(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0xFF0B111E),
                          Color(0xFF1E293B),
                          Color(0xFF33202A),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: [0.0, 0.28, 0.60, 1.0],
                    colors: [
                      Color(0xED0A101D),
                      Color(0x8A0C1424),
                      Color(0x22000000),
                      Color(0xDB070B14),
                    ],
                  ),
                ),
              ),
            ),
            SafeArea(
              child: AnimatedBuilder(
                animation: _controller,
                builder: (context, _) {
                  final exitVal = reduceMotion ? 0.0 : _exitFade.value;
                  final foregroundOpacity = (1.0 - exitVal).clamp(0.0, 1.0);
                  final foregroundOffset = Offset(0, -6.0 * exitVal);

                  return Opacity(
                    opacity: foregroundOpacity,
                    child: Transform.translate(
                      offset: foregroundOffset,
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          return Column(
                            children: [
                              const Spacer(flex: 3),
                              _buildBrandGroup(reduceMotion),
                              const Spacer(flex: 5),
                              _buildLoadingGroup(media.width, reduceMotion),
                              const Spacer(flex: 2),
                            ],
                          );
                        },
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBrandGroup(bool reduceMotion) {
    final houseVal = reduceMotion ? 1.0 : _houseEntrance.value;
    final houseOpacity = houseVal.clamp(0.0, 1.0);
    final houseScale = 0.90 + 0.10 * houseVal;
    final houseTranslate = 10.0 * (1.0 - houseVal);

    final titleVal = reduceMotion ? 1.0 : _titleEntrance.value;
    final titleOpacity = titleVal.clamp(0.0, 1.0);
    final titleTranslate = 8.0 * (1.0 - titleVal);

    final locVal = reduceMotion ? 1.0 : _locationEntrance.value;
    final locOpacity = locVal.clamp(0.0, 1.0);
    final locTranslate = 6.0 * (1.0 - locVal);

    final orbitVal = reduceMotion ? 1.0 : _orbitProgress.value;

    return RepaintBoundary(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Opacity(
            opacity: houseOpacity,
            child: Transform.translate(
              offset: Offset(0, houseTranslate),
              child: Transform.scale(
                scale: houseScale,
                child: SizedBox(
                  width: 104,
                  height: 104,
                  child: CustomPaint(
                    key: const ValueKey('splash_orbit_mark'),
                    painter: _OrbitHousePainter(
                      orbitProgress: orbitVal,
                      houseColor: const Color(0xFFFAF7F2),
                      trackColor: const Color(0x2BFAF7F2),
                      travelColor: const Color(0xD8FAF7F2),
                      glowColor: const Color(0xFFFFF7EB),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: Tokens.s16),
          Opacity(
            opacity: titleOpacity,
            child: Transform.translate(
              offset: Offset(0, titleTranslate),
              child: const Text(
                'Find a place',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'SF Pro Display',
                  fontFamilyFallback: Tokens.fontFallback,
                  fontSize: 25.0,
                  fontWeight: FontWeight.w400,
                  letterSpacing: -0.2,
                  color: Color(0xFFFAF7F2),
                  height: 1.2,
                ),
              ),
            ),
          ),
          const SizedBox(height: Tokens.s6),
          Opacity(
            opacity: locOpacity,
            child: Transform.translate(
              offset: Offset(0, locTranslate),
              child: const Text(
                'CEBU CITY',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'SF Pro Text',
                  fontFamilyFallback: Tokens.fontFallback,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 4.2,
                  color: Color(0xB8ECE8E1),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingGroup(double screenWidth, bool reduceMotion) {
    final textVal = reduceMotion ? 1.0 : _loadingTextEntrance.value;
    final textOpacity = textVal.clamp(0.0, 1.0);
    final textTranslate = 4.0 * (1.0 - textVal);

    final progressVal = reduceMotion ? 1.0 : _bottomProgress.value;
    final barWidth = (screenWidth * 0.40).clamp(140.0, 180.0);

    return RepaintBoundary(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            key: const ValueKey('splash_progress_container'),
            width: barWidth,
            height: 2.5,
            child: Stack(
              children: [
                Container(
                  width: barWidth,
                  height: 2.5,
                  decoration: BoxDecoration(
                    color: const Color(0x33FFFFFF),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: FractionallySizedBox(
                    key: ValueKey('splash_progress_fill_${(progressVal * 100).toInt()}'),
                    widthFactor: progressVal.clamp(0.0, 1.0),
                    child: Container(
                      height: 2.5,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFAF7F2),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: Tokens.s12),
          Opacity(
            opacity: textOpacity,
            child: Transform.translate(
              offset: Offset(0, textTranslate),
              child: const Text(
                'Finding your next place...',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'SF Pro Text',
                  fontFamilyFallback: Tokens.fontFallback,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w400,
                  letterSpacing: 0.6,
                  color: Color(0x9EFAF7F2),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OrbitHousePainter extends CustomPainter {
  const _OrbitHousePainter({
    required this.orbitProgress,
    required this.houseColor,
    required this.trackColor,
    required this.travelColor,
    required this.glowColor,
  });

  final double orbitProgress;
  final Color houseColor;
  final Color trackColor;
  final Color travelColor;
  final Color glowColor;

  static const double _startAngle = -2.70526;
  static const double _sweepAngle = 2.09440;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2 + 1);
    final radius = size.width * 0.40;

    final trackPaint = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    canvas.drawCircle(center, radius, trackPaint);

    final clampedProgress = orbitProgress.clamp(0.0, 1.0);
    if (clampedProgress > 0.001) {
      final travelPaint = Paint()
        ..color = travelColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.8
        ..strokeCap = StrokeCap.round;

      final currentSweep = _sweepAngle * clampedProgress;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        _startAngle,
        currentSweep,
        false,
        travelPaint,
      );
    }

    final currentAngle = _startAngle + (_sweepAngle * clampedProgress);
    final point = Offset(
      center.dx + radius * math.cos(currentAngle),
      center.dy + radius * math.sin(currentAngle),
    );

    final outerGlowPaint = Paint()
      ..color = glowColor.withValues(alpha: 0.22)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3.0);
    canvas.drawCircle(point, 6.8, outerGlowPaint);

    final midGlowPaint = Paint()
      ..color = glowColor.withValues(alpha: 0.50);
    canvas.drawCircle(point, 3.8, midGlowPaint);

    final corePaint = Paint()
      ..color = const Color(0xFFFFFFFF);
    canvas.drawCircle(point, 2.2, corePaint);

    _paintHouse(canvas, center, houseColor);
  }

  void _paintHouse(Canvas canvas, Offset center, Color color) {
    final strokePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final fillPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    const halfW = 21.0;
    const bodyHalfW = 15.0;
    const topY = -15.0;
    const eaveY = 0.0;
    const baseY = 19.0;

    final cX = center.dx;
    final cY = center.dy;

    final roofPath = Path()
      ..moveTo(cX - halfW, cY + eaveY)
      ..lineTo(cX, cY + topY)
      ..lineTo(cX + halfW, cY + eaveY);
    canvas.drawPath(roofPath, strokePaint);

    const chimneyLeft = 8.5;
    const chimneyRight = 12.5;
    const chimneyTop = -14.5;
    const chimneyRoofIntersect = -6.5;

    final chimneyPath = Path()
      ..moveTo(cX + chimneyLeft, cY + -9.5)
      ..lineTo(cX + chimneyLeft, cY + chimneyTop)
      ..lineTo(cX + chimneyRight, cY + chimneyTop)
      ..lineTo(cX + chimneyRight, cY + chimneyRoofIntersect);
    canvas.drawPath(chimneyPath, strokePaint);

    final wallsPath = Path()
      ..moveTo(cX - bodyHalfW, cY + eaveY)
      ..lineTo(cX - bodyHalfW, cY + baseY)
      ..lineTo(cX + bodyHalfW, cY + baseY)
      ..lineTo(cX + bodyHalfW, cY + eaveY);
    canvas.drawPath(wallsPath, strokePaint);

    const winSize = 3.6;
    const row1Y = 4.5;
    const row2Y = 11.5;
    const col1X = -8.5;
    const col2X = 5.0;

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cX + col1X, cY + row1Y, winSize, winSize),
        const Radius.circular(0.8),
      ),
      fillPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cX + col2X, cY + row1Y, winSize, winSize),
        const Radius.circular(0.8),
      ),
      fillPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cX + col1X, cY + row2Y, winSize, winSize),
        const Radius.circular(0.8),
      ),
      fillPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(cX + col2X, cY + row2Y, winSize, winSize),
        const Radius.circular(0.8),
      ),
      fillPaint,
    );
  }

  @override
  bool shouldRepaint(_OrbitHousePainter oldDelegate) {
    return oldDelegate.orbitProgress != orbitProgress ||
        oldDelegate.houseColor != houseColor ||
        oldDelegate.trackColor != trackColor ||
        oldDelegate.travelColor != travelColor ||
        oldDelegate.glowColor != glowColor;
  }
}
