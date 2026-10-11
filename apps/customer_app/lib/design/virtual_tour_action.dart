import 'package:flutter/material.dart';

import 'tokens.dart';
import 'virtual_tour_icon.dart';

enum VirtualTourActionVariant {
  light,
  dark,
}

class VirtualTourAction extends StatelessWidget {
  const VirtualTourAction({
    super.key,
    required this.title,
    required this.onTap,
    this.variant = VirtualTourActionVariant.dark,
    this.iconSize = 16,
  });

  final String title;
  final VoidCallback? onTap;
  final VirtualTourActionVariant variant;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    final isLight = variant == VirtualTourActionVariant.light;
    final foregroundColor = isLight ? Tokens.primaryNavy : Colors.white;
    final backgroundColor = isLight
        ? Colors.white.withValues(alpha: 0.92)
        : Colors.black.withValues(alpha: 0.55);

    Widget content = Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 6,
      ),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: const BorderRadius.all(Tokens.rPill),
        border: isLight
            ? null
            : Border.all(
                color: Colors.white.withValues(alpha: 0.4),
                width: 1.2,
              ),
        boxShadow: isLight
            ? const [
                BoxShadow(
                  color: Color(0x14000000),
                  blurRadius: 4,
                  offset: Offset(0, 1),
                ),
              ]
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          VirtualTourIcon(
            size: iconSize,
            color: foregroundColor,
          ),
          const SizedBox(width: 6),
          Text(
            title,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: foregroundColor,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );

    if (onTap != null) {
      content = GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: content,
      );
    }

    return Semantics(
      button: onTap != null,
      onTap: onTap,
      label: title,
      excludeSemantics: true,
      child: content,
    );
  }
}