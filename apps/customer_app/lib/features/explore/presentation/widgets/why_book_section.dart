import 'package:flutter/material.dart';

import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import 'info_section.dart';

class WhyBookSection extends StatelessWidget {
  const WhyBookSection({super.key});

  static const List<({IconData icon, String title, String body})> reasons = [
    (
      icon: Icons.support_agent_rounded,
      title: 'Reliable customer support',
      body: 'Get help before, during and after your stay. Our team is here to make your experience smooth and '
          'worry-free.',
    ),
    (
      icon: Icons.favorite_border_rounded,
      title: 'A platform made for you.',
      body: 'Enjoy an easy and seamless booking experience, with curated stays designed around your needs.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
      sliver: SliverList.list(
        children: [
          const InfoSectionTitle('Why Book with Westayplace?'),
          for (final reason in reasons)
            InfoTile(
              child: Padding(
                padding: const EdgeInsets.all(Tokens.s12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: Tokens.tap,
                      height: Tokens.tap,
                      decoration: const BoxDecoration(color: Tokens.softBlue, shape: BoxShape.circle),
                      child: Icon(reason.icon, size: Tokens.controlIcon, color: Tokens.primaryNavy),
                    ),
                    const SizedBox(width: Tokens.s12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(reason.title, style: AppText.cardTitle),
                          const SizedBox(height: Tokens.s2),
                          Text(reason.body, maxLines: 3, overflow: TextOverflow.ellipsis, style: AppText.caption),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
