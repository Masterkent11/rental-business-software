import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../data/discovery_repository.dart';
import '../../../../design/app_image.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';

class ExplorePopularAreas extends StatelessWidget {
  const ExplorePopularAreas({
    required this.areas,
    required this.onAreaSelected,
    this.selectedArea,
    super.key,
  });

  final List<PopularAreaView> areas;
  final ValueChanged<PopularAreaView> onAreaSelected;
  final String? selectedArea;

  static const double _tileWidth = 112;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: Tokens.popularAreaHeight,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: Tokens.scroll,
        padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
        itemCount: areas.length,
        separatorBuilder: (_, __) => const SizedBox(width: Tokens.s12),
        itemBuilder: (context, index) {
          final area = areas[index];
          final isSelected = area.areaLabel == selectedArea;
          final count = area.listingCount == 1 ? '1 listing' : '${area.listingCount} listings';
          return Semantics(
            button: true,
            selected: isSelected,
            label: '${area.displayName}, ${area.cityLabel}, $count',
            excludeSemantics: true,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () {
                HapticFeedback.selectionClick();
                onAreaSelected(area);
              },
              child: SizedBox(
                width: _tileWidth,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AnimatedContainer(
                      duration: Tokens.quick,
                      height: Tokens.popularAreaImageHeight,
                      width: _tileWidth,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(Tokens.rControl),
                        border: Border.all(
                          color: isSelected ? Tokens.primaryNavy : Tokens.hairline,
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(Tokens.rControl - 1),
                        child: AppImage(
                          url: area.coverPhotoUrl ?? '',
                          fallbackIcon: Icons.location_city_outlined,
                          cacheWidth: 240,
                        ),
                      ),
                    ),
                    const SizedBox(height: Tokens.s6),
                    Text(area.displayName, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.chip),
                    Text('$count · ${area.cityLabel}',
                        maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.caption),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
