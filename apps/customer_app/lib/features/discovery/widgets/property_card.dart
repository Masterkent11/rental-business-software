import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../design/app_image.dart';
import '../../../design/tokens.dart';
import '../../../design/virtual_tour_action.dart';
import '../../../fixtures/view_models.dart';
import '../../saved/saved_controller.dart';
import '../../listing/listing_price.dart';

class PropertyCard extends ConsumerWidget {
  const PropertyCard({
    super.key,
    required this.listing,
    required this.onTap,
    this.width,
  });

  final ListingCardView listing;
  final VoidCallback onTap;
  final double? width;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cardWidth = width ?? (MediaQuery.sizeOf(context).width - 32) * 0.88;
    final saved = ref.watch(isSavedProvider(listing.id));

    final metaList = <String>[];
    if (listing.maxGuests > 0) {
      metaList.add('${listing.maxGuests} ${listing.maxGuests == 1 ? "guest" : "guests"}');
    }
    if (listing.beds > 0) {
      metaList.add('${listing.beds} ${listing.beds == 1 ? "bed" : "beds"}');
    }
    if (listing.baths > 0) {
      metaList.add('${listing.baths} ${listing.baths == 1 ? "bath" : "baths"}');
    }
    final area = listing.sqm ?? listing.lotAreaSqm;
    if (area != null && area > 0) {
      metaList.add('$area m²');
    }
    final metaText = metaList.join(' · ');

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: SizedBox(
        width: cardWidth,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 195,
              width: cardWidth,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    AppImage(
                      url: listing.photos.isEmpty ? '' : listing.photos.first,
                      fallbackIcon: Icons.home_outlined,
                      seed: listing.id.length,
                    ),
                    Positioned(
                      top: 10,
                      right: 10,
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () {
                          HapticFeedback.selectionClick();
                          ref.read(savedIdsProvider.notifier).toggle(listing.id).catchError((_) {});
                        },
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.92),
                            shape: BoxShape.circle,
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x18000000),
                                blurRadius: 4,
                                offset: Offset(0, 1),
                              ),
                            ],
                          ),
                          child: Icon(
                            saved ? Icons.favorite : Icons.favorite_border,
                            size: 16,
                            color: saved ? const Color(0xFFE53935) : Tokens.primaryNavy,
                          ),
                        ),
                      ),
                    ),
                    if (listing.hasTour)
                      Positioned(
                        left: 10,
                        bottom: 10,
                        child: VirtualTourAction(
                          title: '360°\u200b Tour',
                          variant: VirtualTourActionVariant.dark,
                          onTap: onTap,
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    listing.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                      color: Tokens.primaryNavy,
                      letterSpacing: -0.2,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                if (!listing.hasListedPrice)
                  const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Price on inquiry',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: Tokens.primaryNavy,
                        ),
                      ),
                      SizedBox(width: 3),
                      Icon(
                        Icons.info_outline,
                        size: 13,
                        color: Tokens.primaryNavy,
                      ),
                    ],
                  )
                else
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: listingPriceShort(listing),
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: Tokens.primaryNavy,
                            letterSpacing: -0.2,
                          ),
                        ),
                        TextSpan(
                          text: listing.kind == ListingKind.longTerm ? ' / month' : ' / night',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w400,
                            color: Tokens.muted,
                          ),
                        ),
                      ],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
            const SizedBox(height: 3),
            Text(
              '${listing.areaLabel}, ${listing.cityLabel}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12.5,
                color: Tokens.muted,
              ),
            ),
            if (metaText.isNotEmpty) ...[
              const SizedBox(height: 3),
              Text(
                metaText,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  color: Tokens.muted,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
