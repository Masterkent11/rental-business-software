import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../design/app_image.dart';
import '../../../design/tokens.dart';
import '../../../fixtures/view_models.dart';
import '../../saved/saved_controller.dart';
import '../../listing/listing_price.dart';

class PropertyCard extends ConsumerWidget {
  const PropertyCard({
    super.key,
    required this.listing,
    required this.onTap,
    this.width = 152,
  });

  final ListingCardView listing;
  final VoidCallback onTap;
  final double width;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    assert(() {
      debugPrint(
        'HOME IMAGE DEBUG: '
        'id=${listing.id} '
        'title=${listing.title} '
        'photos=${listing.photos.length} '
        'url=${listing.photos.isEmpty ? "EMPTY" : listing.photos.first}',
      );
      return true;
    }());
    final saved = ref.watch(isSavedProvider(listing.id));

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: Container(
        width: width,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Tokens.hairline),
          boxShadow: const [
            BoxShadow(
              color: Color(0x06000000),
              blurRadius: 6,
              offset: Offset(0, 2),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            AspectRatio(
              aspectRatio: 16 / 10.5,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  AppImage(
                    url: listing.photos.isEmpty ? '' : listing.photos.first,
                    fallbackIcon: Icons.home_outlined,
                    seed: listing.id.length,
                  ),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () {
                        HapticFeedback.selectionClick();
                        ref.read(savedIdsProvider.notifier).toggle(listing.id).catchError((_) {});
                      },
                      child: Container(
                        width: 26,
                        height: 26,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Color(0x18000000),
                              blurRadius: 4,
                              offset: Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Icon(
                          saved ? Icons.favorite : Icons.favorite_border,
                          size: 14,
                          color: saved ? const Color(0xFFE53935) : Tokens.primaryNavy,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 7, 8, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    listing.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: Tokens.primaryNavy,
                      letterSpacing: -0.1,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 11,
                        color: Tokens.muted,
                      ),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          '${listing.areaLabel}, ${listing.cityLabel}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 10,
                            color: Tokens.muted,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: listingPriceShort(listing),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: Tokens.primaryNavy,
                            letterSpacing: -0.2,
                          ),
                        ),
                        TextSpan(
                          text: !listing.hasListedPrice
                              ? ''
                              : listing.kind == ListingKind.longTerm
                                  ? ' / month'
                                  : ' / night',
                          style: const TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w400,
                            color: Tokens.muted,
                          ),
                        ),
                      ],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 5),
                  Row(
                    children: [
                      const Icon(
                        Icons.single_bed_outlined,
                        size: 12,
                        color: Tokens.muted,
                      ),
                      const SizedBox(width: 2),
                      Text(
                        '${listing.beds}',
                        style: const TextStyle(
                          fontSize: 10,
                          color: Tokens.muted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 5),
                      const Icon(
                        Icons.bathtub_outlined,
                        size: 11,
                        color: Tokens.muted,
                      ),
                      const SizedBox(width: 2),
                      Text(
                        '${listing.baths}',
                        style: const TextStyle(
                          fontSize: 10,
                          color: Tokens.muted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 5),
                      const Icon(
                        Icons.crop_square_rounded,
                        size: 11,
                        color: Tokens.muted,
                      ),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          '${listing.sqm} sqm',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 9.5,
                            color: Tokens.muted,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
