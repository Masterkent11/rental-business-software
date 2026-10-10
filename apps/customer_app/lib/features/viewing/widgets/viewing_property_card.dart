import 'package:flutter/material.dart';

import '../../../design/app_image.dart';
import '../../../design/tokens.dart';
import 'viewing_icon.dart';

class ViewingPropertyCard extends StatelessWidget {
  const ViewingPropertyCard({required this.title, required this.place, required this.photo, super.key});

  final String title;
  final String place;
  final String? photo;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: [title, place].where((part) => part.isNotEmpty).join(', '),
      excludeSemantics: true,
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(Tokens.rSm),
            child: SizedBox(
              width: 76,
              height: 64,
              child: AppImage(url: photo ?? '', fallbackIcon: Icons.home_work_outlined, cacheWidth: 228),
            ),
          ),
          const SizedBox(width: Tokens.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14.5,
                    height: 1.3,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.1,
                    color: Tokens.primaryNavy,
                  ),
                ),
                if (place.isNotEmpty) ...[
                  const SizedBox(height: Tokens.s4),
                  Row(
                    children: [
                      const ViewingIcon(ViewingGlyph.location, size: 14, color: Tokens.muted),
                      const SizedBox(width: Tokens.s4),
                      Expanded(
                        child: Text(
                          place,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12.5, color: Tokens.muted),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
