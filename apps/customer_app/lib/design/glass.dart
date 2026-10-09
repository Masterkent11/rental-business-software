import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'tokens.dart';

class Glass extends StatelessWidget {
  const Glass({
    required this.child,
    this.padding = const EdgeInsets.symmetric(
      horizontal: Tokens.s16,
      vertical: Tokens.s8,
    ),
    this.radius = 999,
    this.color = Tokens.glass,
    this.onTap,
    this.border = true,
    super.key,
  }) : _size = null;

  const Glass.circle({
    required this.child,
    this.color = Tokens.glass,
    this.onTap,
    this.border = true,
    double size = Tokens.tap,
    super.key,
  })  : padding = EdgeInsets.zero,
        radius = size / 2,
        _size = size;

  final Widget child;
  final EdgeInsets padding;
  final double radius;
  final Color color;
  final VoidCallback? onTap;
  final bool border;

  final double? _size;

  @override
  Widget build(BuildContext context) {
    final content = ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: Tokens.blurSigma,
          sigmaY: Tokens.blurSigma,
        ),
        child: Container(
          width: _size,
          height: _size,
          alignment: _size == null ? null : Alignment.center,
          padding: padding,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(radius),
            border: border ? Border.all(color: Colors.white.withValues(alpha: 0.14), width: 0.5) : null,
          ),
          child: child,
        ),
      ),
    );

    if (onTap == null) return content;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        onTap!();
      },
      child: content,
    );
  }
}

class PhotoScrim extends StatelessWidget {
  const PhotoScrim({this.top = 0.55, this.bottom = 0.75, super.key});

  final double top;
  final double bottom;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.black.withValues(alpha: top),
              Colors.transparent,
              Colors.transparent,
              Colors.black.withValues(alpha: bottom),
            ],
            stops: const [0, 0.24, 0.34, 1],
          ),
        ),
      ),
    );
  }
}

abstract final class GlassStyle {
  static const Color _rim = Color(0x1F17243D);

  static const LinearGradient fill = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFFFFF), Color(0xFFF4F6FA), Color(0xFFE7EBF2)],
    stops: [0, 0.55, 1],
  );

  static const LinearGradient sheen = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0x8CFFFFFF), Color(0x00FFFFFF)],
    stops: [0, 0.48],
  );

  static const List<BoxShadow> shadow = [
    BoxShadow(color: Color(0x1A17243D), blurRadius: 18, offset: Offset(0, 8)),
    BoxShadow(color: Color(0x0A17243D), blurRadius: 3, offset: Offset(0, 1)),
  ];

  static BoxDecoration surface({double radius = Tokens.rControl, bool circle = false}) => BoxDecoration(
        shape: circle ? BoxShape.circle : BoxShape.rectangle,
        borderRadius: circle ? null : BorderRadius.circular(radius),
        gradient: fill,
        border: Border.all(color: _rim, width: 0.8),
        boxShadow: shadow,
      );

  static BoxDecoration highlight({double radius = Tokens.rControl, bool circle = false}) => BoxDecoration(
        shape: circle ? BoxShape.circle : BoxShape.rectangle,
        borderRadius: circle ? null : BorderRadius.circular(radius),
        gradient: sheen,
      );
}

class LiquidGlass extends StatelessWidget {
  const LiquidGlass({
    required this.child,
    this.width,
    this.height,
    this.padding = EdgeInsets.zero,
    this.radius = Tokens.rControl,
    this.blur = false,
    super.key,
  }) : circle = false;

  const LiquidGlass.circle({
    required this.child,
    double size = Tokens.tap,
    this.padding = EdgeInsets.zero,
    this.blur = false,
    super.key,
  })  : width = size,
        height = size,
        radius = size / 2,
        circle = true;

  final Widget child;
  final double? width;
  final double? height;
  final EdgeInsets padding;
  final double radius;
  final bool circle;
  final bool blur;

  @override
  Widget build(BuildContext context) {
    final surface = Container(
      width: width,
      height: height,
      padding: padding,
      alignment: Alignment.center,
      decoration: GlassStyle.surface(radius: radius, circle: circle),
      foregroundDecoration: GlassStyle.highlight(radius: radius, circle: circle),
      child: child,
    );
    if (!blur) return surface;
    final clipped = BackdropFilter(
      filter: ImageFilter.blur(sigmaX: Tokens.blurSigma, sigmaY: Tokens.blurSigma),
      child: surface,
    );
    return circle ? ClipOval(child: clipped) : ClipRRect(borderRadius: BorderRadius.circular(radius), child: clipped);
  }
}
