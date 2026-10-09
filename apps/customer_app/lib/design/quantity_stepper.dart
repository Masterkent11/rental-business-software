import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'tokens.dart';

class QuantityStepper extends StatelessWidget {
  const QuantityStepper({
    required this.label,
    required this.value,
    required this.onChanged,
    this.caption,
    this.min = 0,
    this.max = 99,
    this.compact = false,
    super.key,
  });

  final String label;

  final String? caption;

  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = compact ? 34.0 : 38.0;

    return Padding(
      padding: EdgeInsets.symmetric(vertical: compact ? Tokens.s4 : Tokens.s8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: theme.textTheme.bodyLarge),
                if (caption != null) Text(caption!, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          _Round(
            icon: Icons.remove,
            size: size,
            semanticLabel: 'One fewer $label',
            onTap: value > min ? () => onChanged(value - 1) : null,
          ),
          SizedBox(
            width: 46,
            child: Text(
              '$value',
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium,
            ),
          ),
          _Round(
            icon: Icons.add,
            size: size,
            semanticLabel: 'One more $label',
            onTap: value < max ? () => onChanged(value + 1) : null,
          ),
        ],
      ),
    );
  }
}

class _Round extends StatelessWidget {
  const _Round({
    required this.icon,
    required this.size,
    required this.semanticLabel,
    required this.onTap,
  });

  final IconData icon;
  final double size;
  final String semanticLabel;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final enabled = onTap != null;

    return Semantics(
      button: true,
      enabled: enabled,
      label: semanticLabel,
      child: GestureDetector(
        onTap: enabled
            ? () {
                HapticFeedback.selectionClick();
                onTap!();
              }
            : null,
        child: SizedBox(
          width: Tokens.tap,
          height: Tokens.tap,
          child: Center(
            child: Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: theme.colorScheme.outlineVariant),
              ),
              child: Icon(
                icon,
                size: 18,
                color:
                    enabled ? theme.colorScheme.onSurface : theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.38),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
