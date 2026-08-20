import 'package:flutter/material.dart';

import '../../../design/tokens.dart';

/// The empty-bookings illustration.
///
/// Drawn rather than imported: a bundled PNG would need three densities and
/// would not follow the theme, and the app has no asset pipeline yet. This is
/// vector, themed from the colour scheme, and costs nothing to ship.
///
/// It is a suitcase with a tag — the tag matters, because it is what makes the
/// shape read as *travel* rather than as a generic box at 96pt.
class EmptyBookingsArt extends StatelessWidget {
  const EmptyBookingsArt({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return SizedBox(
      width: 132,
      height: 132,
      child: CustomPaint(
        painter: _SuitcasePainter(
          body: scheme.surfaceContainerHighest,
          line: scheme.outlineVariant,
          accent: Tokens.accent,
          ink: scheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

class _SuitcasePainter extends CustomPainter {
  const _SuitcasePainter({
    required this.body,
    required this.line,
    required this.accent,
    required this.ink,
  });

  final Color body;
  final Color line;
  final Color accent;
  final Color ink;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    final fill = Paint()..color = body;
    final stroke = Paint()
      ..color = line
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round;

    // Soft halo, so the shape sits on something.
    canvas.drawCircle(
      Offset(w / 2, h / 2),
      w * 0.46,
      Paint()..color = ink.withOpacity(0.05),
    );

    // Handle.
    final handle = Rect.fromLTWH(w * 0.36, h * 0.24, w * 0.28, h * 0.16);
    canvas.drawArc(handle, 3.14159, 3.14159, false, stroke);

    // Case.
    final caseRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.20, h * 0.38, w * 0.60, h * 0.40),
      const Radius.circular(12),
    );
    canvas.drawRRect(caseRect, fill);
    canvas.drawRRect(caseRect, stroke);

    // Clasp band.
    canvas.drawLine(
      Offset(w * 0.20, h * 0.52),
      Offset(w * 0.80, h * 0.52),
      stroke,
    );

    // Luggage tag — the detail that makes it read as travel.
    final tag = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.60, h * 0.58, w * 0.20, h * 0.13),
      const Radius.circular(4),
    );
    canvas.drawRRect(tag, Paint()..color = accent.withOpacity(0.16));
    canvas.drawRRect(
      tag,
      Paint()
        ..color = accent
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );

    // Feet.
    for (final dx in [0.32, 0.68]) {
      canvas.drawLine(
        Offset(w * dx, h * 0.78),
        Offset(w * dx, h * 0.84),
        stroke,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _SuitcasePainter old) =>
      old.body != body || old.line != line || old.accent != accent;
}
