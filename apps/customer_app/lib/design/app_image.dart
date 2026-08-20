import 'package:flutter/material.dart';

import 'tokens.dart';

/// Photography, with an honest failure mode.
///
/// The shell has no media pipeline — Step 5 has not defined one — so the images
/// are remote placeholders. Two consequences are handled here rather than left
/// to each screen:
///
///   * **Loading is a real state.** A listing that pops in is fine; a listing
///     that flashes grey then jumps is not. The fade-in is 240ms and the box
///     reserves its space first.
///   * **Failure is a real state.** No network — in a widget test, on a plane,
///     on bad mobile data — falls back to a quiet tonal panel with the resource
///     icon. Never a broken-image glyph, and never an error message inside a
///     card.
class AppImage extends StatelessWidget {
  const AppImage({
    required this.url,
    this.fit = BoxFit.cover,
    this.fallbackIcon = Icons.home_outlined,
    this.seed = 0,
    super.key,
  });

  final String url;
  final BoxFit fit;
  final IconData fallbackIcon;

  /// Keeps the fallback panel visually stable per listing instead of uniform
  /// grey across a whole screen.
  final int seed;

  @override
  Widget build(BuildContext context) {
    return Image.network(
      url,
      fit: fit,
      gaplessPlayback: true,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return _Fallback(icon: fallbackIcon, seed: seed, dim: true);
      },
      errorBuilder: (context, error, stack) =>
          _Fallback(icon: fallbackIcon, seed: seed),
      frameBuilder: (context, child, frame, wasSync) {
        if (wasSync) return child;
        return AnimatedOpacity(
          opacity: frame == null ? 0 : 1,
          duration: const Duration(milliseconds: 240),
          curve: Curves.easeOut,
          child: child,
        );
      },
    );
  }
}

class _Fallback extends StatelessWidget {
  const _Fallback({required this.icon, required this.seed, this.dim = false});

  final IconData icon;
  final int seed;
  final bool dim;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Warm neutrals only. A rainbow of placeholder tints is the fastest way to
    // make a considered app look generated.
    //
    // The dark values are deliberately well above the page background: a
    // placeholder that matches the canvas reads as a rendering failure, not as
    // a photo that has not arrived.
    final hue = ((28 + seed * 11) % 44 + 18).toDouble();
    final top = HSLColor.fromAHSL(1, hue, 0.14, isDark ? 0.26 : 0.91).toColor();
    final bottom =
        HSLColor.fromAHSL(1, hue, 0.12, isDark ? 0.19 : 0.86).toColor();

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [top, bottom],
        ),
      ),
      child: Center(
        child: Icon(
          icon,
          size: 34,
          color: (isDark ? Colors.white : Tokens.ink)
              .withOpacity(dim ? 0.14 : 0.26),
        ),
      ),
    );
  }
}
