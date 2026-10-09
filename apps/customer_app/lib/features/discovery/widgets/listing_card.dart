import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../design/app_image.dart';
import '../../../design/money.dart';
import '../../../design/motion.dart';
import '../../../design/tokens.dart';
import '../../../design/typography.dart';
import '../../../fixtures/view_models.dart';
import '../../listing/widgets/listing_attributes.dart';
import '../../saved/saved_controller.dart';

class ListingCard extends ConsumerWidget {
  const ListingCard({required this.listing, required this.onTap, super.key});

  final ListingCardView listing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(isSavedProvider(listing.id));
    final specs = listingSpecs(listing);
    final tags = listingHighlights(listing);
    return Semantics(
      button: true,
      label: '${listing.title}, ${listing.place}, ${_priceSemantics(listing)}',
      child: Squeeze(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(Tokens.rCard),
            border: Border.all(color: Tokens.hairline),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AspectRatio(
                aspectRatio: 16 / 10,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Hero(
                      tag: 'photo-${listing.id}',
                      child: AppImage(
                        url: listing.photos.isEmpty ? '' : listing.photos.first,
                        fallbackIcon: listing.isSale ? Icons.home_work_outlined : Icons.apartment_outlined,
                        cacheWidth: 720,
                      ),
                    ),
                    Positioned(
                      top: Tokens.s12,
                      left: Tokens.s12,
                      child: Wrap(
                        spacing: Tokens.s6,
                        children: [
                          _PhotoBadge(label: _intentBadge(listing)),
                          if (listing.isSale && listing.saleStatus == 'PRE_SELLING')
                            const _PhotoBadge(label: 'Pre-selling', dark: true),
                        ],
                      ),
                    ),
                    Positioned(
                      top: Tokens.s8,
                      right: Tokens.s8,
                      child: _SaveButton(
                        saved: saved,
                        onPressed: () => ref.read(savedIdsProvider.notifier).toggle(listing.id).catchError((_) {}),
                      ),
                    ),
                    if (listing.hasTour)
                      const Positioned(
                        left: Tokens.s12,
                        bottom: Tokens.s12,
                        child: _PhotoBadge(label: '360° tour', icon: Icons.threed_rotation, dark: true),
                      ),
                    if (listing.photos.length > 1)
                      Positioned(
                        right: Tokens.s12,
                        bottom: Tokens.s12,
                        child: _PhotoBadge(label: '1/${listing.photos.length}', dark: true),
                      ),
                    if (!listing.isAvailable)
                      Positioned.fill(child: ColoredBox(color: Colors.white.withValues(alpha: 0.45))),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(Tokens.s12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(listing.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: AppText.cardTitle),
                    const SizedBox(height: Tokens.s4),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 15, color: Tokens.muted),
                        const SizedBox(width: Tokens.s4),
                        Expanded(
                          child: Text(
                            [listing.place, if (listing.distanceLabel != null) listing.distanceLabel!].join(' · '),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppText.caption,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: Tokens.s8),
                    _Price(listing: listing),
                    if (!listing.isSale && listing.moveInCost != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        '${Money.peso(listing.moveInCost!.totalCentavos)} to move in',
                        style: AppText.caption.copyWith(color: Tokens.accent, fontWeight: FontWeight.w600),
                      ),
                    ],
                    if (specs.isNotEmpty) ...[
                      const SizedBox(height: Tokens.s8),
                      Wrap(
                        spacing: Tokens.s12,
                        runSpacing: Tokens.s4,
                        children: [for (final spec in specs) _Spec(attribute: spec)],
                      ),
                    ],
                    if (tags.isNotEmpty || !listing.isAvailable) ...[
                      const SizedBox(height: Tokens.s12),
                      Wrap(
                        spacing: Tokens.s6,
                        runSpacing: Tokens.s6,
                        children: [
                          if (!listing.isAvailable) _Tag(label: listing.availabilityLabel, color: Tokens.taken),
                          for (final tag in tags) _Tag(label: tag.label),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _intentBadge(ListingCardView listing) {
    if (listing.isSale) return 'For Sale';
    return listing.kind == ListingKind.longTerm ? 'Monthly' : 'Short stay';
  }

  static String _priceSemantics(ListingCardView listing) {
    final price = listing.priceCentavos;
    if (listing.isSale || price == null) return kPriceOnInquiry;
    return '${Money.peso(price)} ${listing.kind == ListingKind.longTerm ? 'per month' : 'per night'}';
  }
}

class _Price extends StatelessWidget {
  const _Price({required this.listing});

  final ListingCardView listing;

  @override
  Widget build(BuildContext context) {
    final price = listing.priceCentavos;
    if (listing.isSale || price == null) {
      return const Row(
        children: [
          Icon(Icons.lock_outline, size: 15, color: Tokens.primaryNavy),
          SizedBox(width: Tokens.s4),
          Flexible(
            child: Text(kPriceOnInquiry, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.captionStrong),
          ),
        ],
      );
    }
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(text: Money.peso(price), style: AppText.cardTitle.copyWith(fontSize: 18)),
          TextSpan(text: listing.kind == ListingKind.longTerm ? ' / month' : ' / night', style: AppText.caption),
        ],
      ),
    );
  }
}

class _Spec extends StatelessWidget {
  const _Spec({required this.attribute});

  final ListingAttribute attribute;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(attribute.icon, size: 16, color: Tokens.muted),
        const SizedBox(width: Tokens.s4),
        Text(attribute.label, style: AppText.caption.copyWith(color: Tokens.ink)),
      ],
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.label, this.color = Tokens.primaryNavy});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: Tokens.s8, vertical: Tokens.s4),
      decoration: BoxDecoration(color: const Color(0xFFF2F3F5), borderRadius: BorderRadius.circular(Tokens.rSm)),
      child: Text(label, style: AppText.caption.copyWith(color: color, fontWeight: FontWeight.w600)),
    );
  }
}

class _PhotoBadge extends StatelessWidget {
  const _PhotoBadge({required this.label, this.icon, this.dark = false});

  final String label;
  final IconData? icon;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final foreground = dark ? Colors.white : Tokens.primaryNavy;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: dark ? Colors.black.withValues(alpha: 0.6) : Colors.white.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(Tokens.rSm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 14, color: foreground), const SizedBox(width: Tokens.s4)],
          Text(label, style: AppText.caption.copyWith(color: foreground, fontWeight: FontWeight.w700, fontSize: 12)),
        ],
      ),
    );
  }
}

class _SaveButton extends StatelessWidget {
  const _SaveButton({required this.saved, required this.onPressed});

  final bool saved;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: saved ? 'Remove from saved' : 'Save',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onPressed,
        child: SizedBox(
          width: Tokens.tap,
          height: Tokens.tap,
          child: Center(
            child: Container(
              width: Tokens.badgeSize,
              height: Tokens.badgeSize,
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.94), shape: BoxShape.circle),
              child: Icon(
                saved ? Icons.favorite : Icons.favorite_border,
                size: 19,
                color: saved ? Tokens.taken : Tokens.primaryNavy,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
