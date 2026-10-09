import 'package:flutter/material.dart';

import '../../../../design/controls.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';

class SearchSummaryChip extends StatelessWidget {
  const SearchSummaryChip({required this.icon, required this.label, required this.onClear, this.onTap, super.key});

  final IconData icon;
  final String label;
  final VoidCallback onClear;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: onTap != null,
      label: label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          height: Tokens.chipHeight,
          padding: const EdgeInsets.only(left: Tokens.s12),
          decoration: BoxDecoration(
            color: Tokens.softBlue,
            borderRadius: BorderRadius.circular(Tokens.chipHeight / 2),
            border: Border.all(color: Tokens.primaryNavy.withValues(alpha: 0.12)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: Tokens.iconSm, color: Tokens.primaryNavy),
              const SizedBox(width: Tokens.s6),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppText.chip.copyWith(color: Tokens.primaryNavy),
                ),
              ),
              AppIconButton(
                icon: Icons.close_rounded,
                semanticLabel: 'Remove $label',
                onPressed: onClear,
                size: Tokens.iconSm,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
