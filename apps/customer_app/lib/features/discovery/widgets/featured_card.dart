import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../design/app_image.dart';
import '../../../design/money.dart';
import '../../../design/tokens.dart';
import '../../../fixtures/view_models.dart';
import '../../saved/saved_controller.dart';

class FeaturedPropertyCarousel extends StatefulWidget {
  const FeaturedPropertyCarousel({
    super.key,
    required this.listings,
    required this.onTapListing,
  });

  final List<ListingCardView> listings;
  final ValueChanged<ListingCardView> onTapListing;

  @override
  State<FeaturedPropertyCarousel> createState() =>
      _FeaturedPropertyCarouselState();
}

class _FeaturedPropertyCarouselState extends State<FeaturedPropertyCarousel> {
  final _pageController = PageController();
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.listings.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
          child: SizedBox(
            height: 288,
            child: PageView.builder(
              controller: _pageController,
              itemCount: widget.listings.length,
              onPageChanged: (index) {
                setState(() => _currentPage = index);
              },
              itemBuilder: (context, index) {
                final listing = widget.listings[index];
                return FeaturedPropertyCard(
                  listing: listing,
                  onTap: () => widget.onTapListing(listing),
                );
              },
            ),
          ),
        ),
        if (widget.listings.length > 1) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < widget.listings.length; i++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 2.5),
                  width: i == _currentPage ? 14 : 4,
                  height: 4,
                  decoration: BoxDecoration(
                    color: i == _currentPage
                        ? Tokens.primaryBlue
                        : const Color(0xFFD6D6D3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class FeaturedPropertyCard extends ConsumerWidget {
  const FeaturedPropertyCard({
    super.key,
    required this.listing,
    required this.onTap,
  });

  final ListingCardView listing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(isSavedProvider(listing.id));
    final priceStr = Money.peso(listing.priceCentavos);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Tokens.hairline),
          boxShadow: const [
            BoxShadow(
              color: Color(0x06000000),
              blurRadius: 8,
              offset: Offset(0, 2),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 16 / 8.8,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  AppImage(
                    url: listing.photos.isEmpty ? '' : listing.photos.first,
                    fallbackIcon: Icons.apartment_outlined,
                    seed: listing.id.length + 3,
                  ),
                  Positioned(
                    bottom: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x14000000),
                            blurRadius: 4,
                            offset: Offset(0, 1),
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.local_fire_department,
                            size: 13,
                            color: Color(0xFFFA541C),
                          ),
                          SizedBox(width: 3),
                          Text(
                            'Popular',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Tokens.primaryNavy,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    top: 10,
                    right: 10,
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () {
                        HapticFeedback.selectionClick();
                        ref
                            .read(savedIdsProvider.notifier)
                            .toggle(listing.id)
                            .catchError((_) {});
                      },
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Color(0x14000000),
                              blurRadius: 4,
                              offset: Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Icon(
                          saved ? Icons.favorite : Icons.favorite_border,
                          size: 17,
                          color: saved
                              ? const Color(0xFFE53935)
                              : Tokens.primaryNavy,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
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
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.star_rounded,
                            size: 15,
                            color: Color(0xFFF59E0B),
                          ),
                          const SizedBox(width: 2),
                          Text(
                            listing.rating?.toStringAsFixed(1) ?? '4.8',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Tokens.primaryNavy,
                            ),
                          ),
                          Text(
                            ' (${listing.reviewCount ?? 120})',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Tokens.muted,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 13,
                        color: Tokens.muted,
                      ),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          '${listing.areaLabel.isNotEmpty ? listing.areaLabel : "IT Park"}, ${listing.cityLabel.isNotEmpty ? listing.cityLabel : "Cebu City"}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Tokens.muted,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 7),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: priceStr,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: Tokens.primaryNavy,
                                letterSpacing: -0.3,
                              ),
                            ),
                            TextSpan(
                              text: listing.kind == ListingKind.longTerm
                                  ? ' / month'
                                  : ' / night',
                              style: const TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w400,
                                color: Tokens.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Flexible(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.single_bed_outlined,
                                size: 14,
                                color: Tokens.muted,
                              ),
                              Text(
                                ' ${listing.beds} Bed',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Tokens.muted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(width: 7),
                              const Icon(
                                Icons.bathtub_outlined,
                                size: 13,
                                color: Tokens.muted,
                              ),
                              Text(
                                ' ${listing.baths} Bath',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Tokens.muted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(width: 7),
                              const Icon(
                                Icons.crop_square_rounded,
                                size: 13,
                                color: Tokens.muted,
                              ),
                              Text(
                                ' ${listing.sqm} sqm',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Tokens.muted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
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

typedef FeaturedCard = FeaturedPropertyCard;
