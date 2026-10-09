import 'package:flutter/material.dart';

import '../../../../design/motion.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';

class CategoryPhotoCard extends StatelessWidget {
  const CategoryPhotoCard({
    required this.image,
    required this.title,
    required this.subtitle,
    required this.onTap,
    super.key,
  });

  final String image;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '$title. $subtitle',
      excludeSemantics: true,
      child: Squeeze(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(Tokens.rCard),
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.asset(image, fit: BoxFit.cover, cacheWidth: 600),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0x00000000), Color(0x22000000), Color(0xB3000000)],
                    stops: [0.3, 0.55, 1],
                  ),
                ),
              ),
              Positioned(
                left: Tokens.s12,
                right: Tokens.s12,
                bottom: Tokens.s12,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.editorialTitle),
                          const SizedBox(height: 2),
                          Text(subtitle,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: AppText.caption.copyWith(color: Colors.white)),
                        ],
                      ),
                    ),
                    const SizedBox(width: Tokens.s8),
                    Container(
                      width: Tokens.s32,
                      height: Tokens.s32,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.28),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withValues(alpha: 0.5)),
                      ),
                      child: const Icon(Icons.chevron_right_rounded, size: Tokens.controlIcon, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
