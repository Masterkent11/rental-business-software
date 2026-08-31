import 'dart:ui';
import 'package:flutter/material.dart';
import 'tokens.dart';

class GlassContainer extends StatelessWidget {
  const GlassContainer({
    required this.child,
    super.key,
    this.blur = 20.0,
    this.opacity = 0.7,
    this.borderRadius,
    this.border,
    this.borderColor,
    this.padding = const EdgeInsets.all(Tokens.s12),
  });

  final Widget child;
  final double blur;
  final double opacity;
  final BorderRadius? borderRadius;
  final BoxBorder? border;
  final Color? borderColor;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final effectiveRadius = borderRadius ?? Tokens.borderMd;

    return ClipRRect(
      borderRadius: effectiveRadius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: Tokens.surface.withOpacity(opacity),
            borderRadius: effectiveRadius,
            border: border ??
                Border.all(
                  color: borderColor ?? Tokens.surface.withOpacity(0.4),
                  width: 0.5,
                ),
          ),
          child: child,
        ),
      ),
    );
  }
}
