import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../design/tokens.dart';

enum ViewingMotion { matching, success, spinner, pending }

class ViewingAnimation extends StatefulWidget {
  const ViewingAnimation({
    required this.kind,
    this.size = 224,
    this.animate = true,
    this.tone = Tokens.primaryNavy,
    this.semanticLabel,
    super.key,
  });

  final ViewingMotion kind;
  final double size;
  final bool animate;
  final Color tone;
  final String? semanticLabel;

  @override
  State<ViewingAnimation> createState() => _ViewingAnimationState();
}

class _ViewingAnimationState extends State<ViewingAnimation> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _configure();
  }

  @override
  void didUpdateWidget(covariant ViewingAnimation oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.kind != widget.kind || oldWidget.animate != widget.animate) _configure();
  }

  void _configure() {
    _controller.stop();
    _controller.duration = Duration(
      milliseconds: switch (widget.kind) {
        ViewingMotion.matching => 3000,
        ViewingMotion.success => 650,
        ViewingMotion.spinner => 1000,
        ViewingMotion.pending => 1800,
      },
    );
    final still = !widget.animate || (MediaQuery.maybeOf(context)?.disableAnimations ?? false);
    if (still) {
      _controller.value = widget.kind == ViewingMotion.success ? 1 : 0;
    } else if (widget.kind == ViewingMotion.success) {
      _controller.forward(from: 0);
    } else {
      _controller
        ..value = 0
        ..repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final label = widget.semanticLabel;
    final painted = RepaintBoundary(
      child: SizedBox.square(
        dimension: widget.size,
        child: AnimatedBuilder(
          animation: _controller,
          builder: (_, __) => CustomPaint(painter: _ViewingPainter(widget.kind, _controller.value, widget.tone)),
        ),
      ),
    );
    if (label == null) return ExcludeSemantics(child: painted);
    return Semantics(image: true, label: label, child: ExcludeSemantics(child: painted));
  }
}

class _ViewingPainter extends CustomPainter {
  _ViewingPainter(this.kind, this.t, this.tone);

  final ViewingMotion kind;
  final double t;
  final Color tone;

  static const Color _navy = Tokens.primaryNavy;

  void _circle(Canvas canvas, Offset at, double radius, Color color) =>
      canvas.drawCircle(at, radius, Paint()..color = color);

  Paint _stroke(Color color, double width) => Paint()
    ..color = color
    ..style = PaintingStyle.stroke
    ..strokeWidth = width
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round;

  Path _line(List<Offset> points) {
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (final point in points.skip(1)) {
      path.lineTo(point.dx, point.dy);
    }
    return path;
  }

  @override
  void paint(Canvas canvas, Size size) {
    canvas
      ..save()
      ..scale(size.width / 256, size.height / 256);
    const center = Offset(128, 128);
    switch (kind) {
      case ViewingMotion.matching:
        _circle(canvas, center, 112, Tokens.softBlue.withValues(alpha: 0.6));
        _circle(canvas, center, 84, Tokens.softBlue);
        _circle(canvas, center, 49, Tokens.primaryBlue.withValues(alpha: 0.10));
        const phases = [0.0, 4.05, 2.4];
        const radii = [6.0, 5.0, 4.0];
        for (var i = 0; i < 3; i++) {
          final angle = t * math.pi * 2 + phases[i];
          _circle(
            canvas,
            Offset(128 + math.cos(angle) * 102, 128 + math.sin(angle) * 102),
            radii[i],
            i == 2 ? Tokens.muted.withValues(alpha: 0.45) : _navy,
          );
        }
        canvas.drawPath(
          _line(const [
            Offset(108, 153),
            Offset(108, 126),
            Offset(128, 106),
            Offset(148, 126),
            Offset(148, 153),
            Offset(134, 153),
            Offset(134, 135),
            Offset(122, 135),
            Offset(122, 153),
            Offset(108, 153),
          ]),
          _stroke(_navy, 4),
        );
        _circle(canvas, const Offset(128, 49), 19, _navy);
        canvas.drawPath(
          _line(const [Offset(119, 49), Offset(125, 55), Offset(137, 42)]),
          _stroke(Colors.white, 3),
        );
      case ViewingMotion.success:
        _circle(canvas, center, 80, Tokens.available.withValues(alpha: 0.10));
        final check = _line(const [Offset(94, 129), Offset(117, 152), Offset(163, 103)]);
        final metric = check.computeMetrics().first;
        canvas.drawPath(metric.extractPath(0, metric.length * Curves.easeOutCubic.transform(t)), _stroke(tone, 7));
      case ViewingMotion.spinner:
        canvas.drawCircle(center, 64, _stroke(Tokens.hairline, 22));
        canvas.drawArc(
          Rect.fromCircle(center: center, radius: 64),
          t * math.pi * 2 - math.pi / 2,
          math.pi / 2,
          false,
          _stroke(_navy, 22),
        );
      case ViewingMotion.pending:
        _circle(canvas, center, 70 + 30 * math.sin(t * math.pi * 2).abs(), Tokens.softBlue);
        _circle(canvas, center, 72, _navy);
        _circle(canvas, center, 54, Colors.white);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _ViewingPainter old) => old.kind != kind || old.t != t || old.tone != tone;
}
