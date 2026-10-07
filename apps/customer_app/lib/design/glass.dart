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
  }) : padding = EdgeInsets.zero,
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
            border: border
                ? Border.all(color: Colors.white.withValues(alpha: 0.14), width: 0.5)
                : null,
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
