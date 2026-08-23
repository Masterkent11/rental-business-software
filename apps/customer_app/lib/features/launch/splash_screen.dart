import 'package:flutter/material.dart';

import '../../design/tokens.dart';

/// The first second of the app.
///
/// A splash earns its place only if it hides real work. This one covers the
/// Supabase session restore and the first listings fetch — both of which happen
/// before there is anything worth showing — so the customer sees an intentional
/// screen instead of an empty one.
///
/// It is deliberately quiet: a mark, a line, and a slow fade. A rental app asks
/// people to spend money they have thought about; an energetic launch animation
/// sets the wrong register entirely.
class SplashScreen extends StatefulWidget {
  const SplashScreen({this.onDone, super.key});

  /// Called once the entrance has played out.
  final VoidCallback? onDone;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  );

  @override
  void initState() {
    super.initState();
    _controller.forward().then((_) {
      if (mounted) widget.onDone?.call();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;

    // The mark fades in first, the words follow. Two beats, not one — a single
    // simultaneous fade reads as a loading screen; a sequence reads as a title.
    final mark = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0, 0.55, curve: Tokens.emphasised),
    );
    final words = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.35, 1, curve: Tokens.ease),
    );

    return Scaffold(
      backgroundColor: dark ? Tokens.canvasDark : Tokens.canvas,
      body: Center(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) => Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Opacity(
                opacity: mark.value,
                child: Transform.scale(
                  scale: 0.92 + 0.08 * mark.value,
                  child: _Mark(dark: dark),
                ),
              ),
              const SizedBox(height: Tokens.s24),
              Opacity(
                opacity: words.value,
                child: Transform.translate(
                  offset: Offset(0, 8 * (1 - words.value)),
                  child: Column(
                    children: [
                      Text(
                        'Find a place',
                        style: theme.textTheme.headlineSmall,
                      ),
                      const SizedBox(height: Tokens.s4),
                      Text(
                        'Cebu City',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A door, drawn rather than shipped as an asset.
///
/// Vector, so it is crisp at any density and adds nothing to the bundle. A
/// doorway is the one image that means the same thing to somebody renting a
/// bedspace and somebody renting a condo.
class _Mark extends StatelessWidget {
  const _Mark({required this.dark});

  final bool dark;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 76,
      width: 76,
      child: CustomPaint(
        painter: _DoorPainter(
          ink: dark ? Tokens.inkDark : Tokens.ink,
          accent: Tokens.accent,
        ),
      ),
    );
  }
}

class _DoorPainter extends CustomPainter {
  _DoorPainter({required this.ink, required this.accent});

  final Color ink;
  final Color accent;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = Paint()
      ..color = ink
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4
      ..strokeJoin = StrokeJoin.round
      ..strokeCap = StrokeCap.round;

    // The frame: an arch on a rectangle.
    final w = size.width, h = size.height;
    final frame = Path()
      ..moveTo(w * 0.16, h * 0.94)
      ..lineTo(w * 0.16, h * 0.42)
      ..arcToPoint(
        Offset(w * 0.84, h * 0.42),
        radius: Radius.circular(w * 0.34),
      )
      ..lineTo(w * 0.84, h * 0.94);

    canvas.drawPath(frame, stroke);

    // The threshold — the line you step over.
    canvas.drawLine(
      Offset(w * 0.06, h * 0.94),
      Offset(w * 0.94, h * 0.94),
      stroke,
    );

    // A handle, in the one accent the app allows itself.
    canvas.drawCircle(
      Offset(w * 0.66, h * 0.68),
      3.4,
      Paint()..color = accent,
    );
  }

  @override
  bool shouldRepaint(_DoorPainter old) =>
      old.ink != ink || old.accent != accent;
}
