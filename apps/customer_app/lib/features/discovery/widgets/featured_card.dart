import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../design/app_image.dart';
import '../../../design/glass.dart';
import '../../../design/money.dart';
import '../../../design/tokens.dart';
import '../../../fixtures/view_models.dart';

/// The editorial card at the top of Discover.
///
/// Image-forward with the copy sitting on the photograph, because the first
/// thing a customer is deciding is *do I want to look at this place* — not
/// which of six data points is largest.
class FeaturedCard extends StatelessWidget {
  const FeaturedCard({required this.listing, required this.onTap, super.key});

  final ListingCardView listing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: SizedBox(
        width: 286,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(Tokens.rLg),
          child: Stack(
            fit: StackFit.expand,
            children: [
              AppImage(
                url: listing.photos.isEmpty ? '' : listing.photos.first,
                fallbackIcon: Icons.apartment_outlined,
                seed: listing.id.length + 3,
              ),
              // Strong bottom scrim: the title sits at mid-card and the
              // photograph underneath is unpredictable — bright interiors are
              // exactly what a rental listing is full of.
              const PhotoScrim(top: 0.25, bottom: 0.95),
              Padding(
                padding: const EdgeInsets.all(Tokens.s16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (listing.hasTour)
                      Glass(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 11,
                          vertical: 7,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.threed_rotation,
                              size: 15,
                              color: Colors.white,
                            ),
                            const SizedBox(width: Tokens.s6),
                            Text(
                              '${listing.sceneCount}-room tour',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    const Spacer(),
                    Text(
                      listing.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        height: 1.22,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: Tokens.s4),
                    Text(
                      listing.location,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.78),
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: Tokens.s12),
                    Text(
                      listing.kind == ListingKind.longTerm
                          ? Money.perMonth(listing.priceCentavos)
                          : Money.perNight(listing.priceCentavos),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 19,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.4,
                      ),
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
