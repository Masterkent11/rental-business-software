import 'dart:math' as math;
import 'package:flutter/material.dart';

enum ViewingMotion { matching, success, spinner, pending }

/// Presentation-only motion: never use completion to set booking/API status.
class ViewingAnimation extends StatefulWidget {
  const ViewingAnimation({super.key, required this.kind, this.size = 224,
    this.animate = true});
  final ViewingMotion kind;
  final double size;
  final bool animate;
  @override
  State<ViewingAnimation> createState() => _ViewingAnimationState();
}

class _ViewingAnimationState extends State<ViewingAnimation>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this);
  }
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _configure();
  }
  @override
  void didUpdateWidget(covariant ViewingAnimation oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.kind != widget.kind || oldWidget.animate != widget.animate) {
      _configure();
    }
  }
  void _configure() {
    _controller.stop();
    _controller.duration = Duration(milliseconds: switch (widget.kind) {
      ViewingMotion.matching => 3000,
      ViewingMotion.success => 650,
      ViewingMotion.spinner => 1000,
      ViewingMotion.pending => 1800,
    });
    if (!widget.animate || MediaQuery.of(context).disableAnimations) {
      _controller.value = widget.kind == ViewingMotion.success ? 1 : 0;
    } else if (widget.kind == ViewingMotion.success) {
      _controller.forward(from: 0);
    } else {
      _controller.value = 0;
      _controller.repeat();
    }
  }
  @override
  void dispose() { _controller.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => Semantics(
    image: true,
    label: switch (widget.kind) {
      ViewingMotion.matching => 'Finding an available agent',
      ViewingMotion.success => 'Viewing request sent',
      ViewingMotion.spinner => 'Loading',
      ViewingMotion.pending => 'Awaiting confirmation',
    },
    child: RepaintBoundary(child: SizedBox.square(dimension: widget.size,
      child: AnimatedBuilder(animation: _controller, builder: (_, __) =>
        CustomPaint(painter: _ViewingPainter(widget.kind, _controller.value))))),
  );
}

class _ViewingPainter extends CustomPainter {
  _ViewingPainter(this.kind, this.t);
  final ViewingMotion kind;
  final double t;
  static const navy = Color(0xFF0B2145);
  void circle(Canvas c, Offset at, double r, Color color) =>
    c.drawCircle(at, r, Paint()..color = color);
  Paint stroke(Color color, double width) => Paint()
    ..color = color ..style = PaintingStyle.stroke ..strokeWidth = width
    ..strokeCap = StrokeCap.round ..strokeJoin = StrokeJoin.round;
  Path line(List<Offset> points) {
    final p = Path()..moveTo(points.first.dx, points.first.dy);
    for (final point in points.skip(1)) { p.lineTo(point.dx, point.dy); }
    return p;
  }
  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 256, size.height / 256);
    const center = Offset(128, 128);
    switch (kind) {
      case ViewingMotion.matching:
        circle(canvas, center, 112, const Color(0xFFF4F8FD));
        circle(canvas, center, 84, const Color(0xFFE7F2FF));
        circle(canvas, center, 49, const Color(0xFFD6E9FF));
        for (var i = 0; i < 3; i++) {
          final a = t * math.pi * 2 + [0.0, 4.05, 2.4][i];
          circle(canvas, Offset(128 + math.cos(a) * 102,
            128 + math.sin(a) * 102), [6.0, 5.0, 4.0][i],
            i == 2 ? const Color(0xFFC1CEE1) : navy);
        }
        canvas.drawPath(line(const [Offset(108,153),Offset(108,126),
          Offset(128,106),Offset(148,126),Offset(148,153),Offset(134,153),
          Offset(134,135),Offset(122,135),Offset(122,153),Offset(108,153)]),
          stroke(navy, 4));
        circle(canvas, const Offset(128,49), 19, navy);
        canvas.drawPath(line(const [Offset(119,49),Offset(125,55),Offset(137,42)]),
          stroke(Colors.white, 3));
        break;
      case ViewingMotion.success:
        circle(canvas, center, 80, const Color(0xFFE7F8F0));
        final check = line(const [Offset(94,129),Offset(117,152),Offset(163,103)]);
        final metric = check.computeMetrics().first;
        canvas.drawPath(metric.extractPath(0, metric.length * t), stroke(navy, 7));
        break;
      case ViewingMotion.spinner:
        canvas.drawCircle(center, 64, stroke(const Color(0xFFD6DDE8), 12));
        canvas.drawArc(Rect.fromCircle(center: center, radius: 64),
          t * math.pi * 2 - math.pi / 2, math.pi / 2, false, stroke(navy, 12));
        break;
      case ViewingMotion.pending:
        circle(canvas, center, 53 + 12 * math.sin(t * math.pi * 2),
          const Color(0xFFE7F2FF));
        circle(canvas, center, 26, const Color(0xFFCDD3DF));
        circle(canvas, center, 22, Colors.white);
        break;
    }
    canvas.restore();
  }
  @override
  bool shouldRepaint(covariant _ViewingPainter old) => old.kind != kind || old.t != t;
}
