import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';

class ExploreConciergeCard extends StatelessWidget {
  const ExploreConciergeCard({required this.onTap, super.key});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
      child: Semantics(
        button: true,
        label: 'Need help finding the right home? Tell our support team what you are looking for',
        excludeSemantics: true,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: () {
            HapticFeedback.selectionClick();
            onTap();
          },
          child: Container(
            padding: const EdgeInsets.all(Tokens.s12),
            decoration: BoxDecoration(
              color: Tokens.softBlue,
              borderRadius: BorderRadius.circular(Tokens.rCard),
              border: Border.all(color: Tokens.primaryNavy.withValues(alpha: 0.08)),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                DecoratedBox(
                  decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                  child: SizedBox.square(
                    dimension: Tokens.tap,
                    child: Icon(Icons.support_agent_rounded, size: Tokens.controlIcon, color: Tokens.primaryNavy),
                  ),
                ),
                SizedBox(width: Tokens.s12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Need help finding the right home?', style: AppText.cardTitle),
                      SizedBox(height: 2),
                      Text('Tell our support team what you’re looking for and we’ll get back to you.',
                          style: AppText.caption),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, size: Tokens.controlIcon, color: Tokens.primaryNavy),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
