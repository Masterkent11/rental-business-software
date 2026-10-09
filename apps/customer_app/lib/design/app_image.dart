import 'package:flutter/material.dart';

import 'tokens.dart';

class AppImage extends StatelessWidget {
  const AppImage({
    required this.url,
    this.fit = BoxFit.cover,
    this.fallbackIcon = Icons.home_outlined,
    this.seed = 0,
    this.cacheWidth,
    super.key,
  });

  final int? cacheWidth;
  final String url;
  final BoxFit fit;
  final IconData fallbackIcon;

  final int seed;

  @override
  Widget build(BuildContext context) {
    if (url.isEmpty || !url.startsWith('http')) {
      return _Fallback(icon: fallbackIcon, seed: seed);
    }
    final ratio = MediaQuery.maybeDevicePixelRatioOf(context) ?? 2;
    return Image.network(
      url,
      fit: fit,
      cacheWidth: cacheWidth == null ? null : (cacheWidth! * ratio / 2).round(),
      gaplessPlayback: true,
      errorBuilder: (context, error, stack) {
        assert(() {
          debugPrint('APP_IMAGE ERROR: url=$url error=$error');
          return true;
        }());
        return _Fallback(icon: fallbackIcon, seed: seed);
      },
      frameBuilder: (context, child, frame, wasSync) {
        if (wasSync) return child;
        return Stack(
          fit: StackFit.passthrough,
          children: [
            if (frame == null) _Fallback(icon: fallbackIcon, seed: seed, dim: true),
            AnimatedOpacity(
              opacity: frame == null ? 0 : 1,
              duration: const Duration(milliseconds: 240),
              curve: Curves.easeOut,
              child: child,
            ),
          ],
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

    final hue = ((28 + seed * 11) % 44 + 18).toDouble();
    final top = HSLColor.fromAHSL(1, hue, 0.14, isDark ? 0.26 : 0.91).toColor();
    final bottom = HSLColor.fromAHSL(
      1,
      hue,
      0.12,
      isDark ? 0.19 : 0.86,
    ).toColor();

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
          color: (isDark ? Colors.white : Tokens.ink).withValues(
            alpha: dim ? 0.14 : 0.26,
          ),
        ),
      ),
    );
  }
}
