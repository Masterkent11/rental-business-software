import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'tokens.dart';

class QuantityStepper extends StatelessWidget {
  const QuantityStepper({
    required this.value,
    required this.onChanged,
    super.key,
    this.min = 0,
    this.max = 99,
  });

  final int value;
  final ValueChanged<int> onChanged;
  final int min;
  final int max;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _Button(
          icon: Icons.remove,
          enabled: value > min,
          onTap: () {
            HapticFeedback.selectionClick();
            onChanged(value - 1);
          },
        ),
        SizedBox(
          width: 36,
          child: Text(
            '$value',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: Tokens.ink,
            ),
          ),
        ),
        _Button(
          icon: Icons.add,
          enabled: value < max,
          onTap: () {
            HapticFeedback.selectionClick();
            onChanged(value + 1);
          },
        ),
      ],
    );
  }
}

class _Button extends StatelessWidget {
  const _Button({
    required this.icon,
    required this.enabled,
    required this.onTap,
  });

  final IconData icon;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: Tokens.borderSm,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          border: Border.all(
            color: enabled ? Tokens.line : Tokens.lineSubtle,
          ),
          borderRadius: Tokens.borderSm,
          color: enabled ? Tokens.surface : Tokens.surfaceMuted,
        ),
        child: Icon(
          icon,
          size: 16,
          color: enabled ? Tokens.ink : Tokens.inkSubtle,
        ),
      ),
    );
  }
}
