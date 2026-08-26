import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../design/app_image.dart';
import '../../../design/glass.dart';
import '../../../design/money.dart';
import '../../../design/motion.dart';
import '../../../design/tokens.dart';
import '../../../fixtures/view_models.dart';
import '../../saved/saved_controller.dart';

/// One result in the marketplace list.
///
/// Four things have to be legible at arm's length on a mid-range phone: the
/// price, **what it actually costs to move in**, whether it is available, and
/// whether it has a tour. Everything else is secondary and is styled that way.
class ListingCard extends ConsumerWidget {
  const ListingCard({required this.listing, required this.onTap, super.key});

  final ListingCardView listing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final saved = ref.watch(isSavedProvider(listing.id));

    // Squeeze rather than a bare tap: the card is mostly photograph, and a
    // photograph that does not answer the finger feels like an image rather
    // than a way in.
    return Squeeze(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(Tokens.rLg),
            child: AspectRatio(
              // Listings with a tour get more room. The journey asks for
              // photo-only listings to be visibly less compelling — that
              // asymmetry is what makes owners bother authoring a tour.
              aspectRatio: listing.hasTour ? 4 / 3 : 16 / 10,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Hero(
                    tag: 'photo-${listing.id}',
                    child: AppImage(
                      url: listing.photos.first,
                      fallbackIcon: _iconFor(listing.resourceType),
                      seed: listing.id.length,
                    ),
                  ),
                  Positioned(
                    top: Tokens.s12,
                    right: Tokens.s12,
                    child: Glass.circle(
                      size: 36,
                      onTap: () =>
                          ref.read(savedIdsProvider.notifier).toggle(listing.id),
                      child: Icon(
                        saved ? Icons.favorite : Icons.favorite_border,
                        size: 18,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  if (listing.hasTour)
                    Positioned(
                      left: Tokens.s12,
                      bottom: Tokens.s12,
                      child: _TourBadge(sceneCount: listing.sceneCount),
                    ),
                  if (!listing.isAvailable)
                    Positioned.fill(
                      child: ColoredBox(color: Colors.white.withOpacity(0.45)),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: Tokens.s12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  listing.title,
                  style: theme.textTheme.titleMedium,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: Tokens.s12),
              Text(
                listing.kind == ListingKind.longTerm
                    ? Money.perMonth(listing.priceCentavos)
                    : Money.perNight(listing.priceCentavos),
                style: theme.textTheme.titleMedium,
              ),
            ],
          ),
          const SizedBox(height: Tokens.s4),
          Text(
            '${listing.resourceType.label} · ${listing.location}',
            style: theme.textTheme.bodySmall,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: Tokens.s8),
          Row(
            children: [
              _Availability(listing: listing),
              if (listing.moveInCost != null) ...[
                const SizedBox(width: Tokens.s8),
                Text('·', style: theme.textTheme.bodySmall),
                const SizedBox(width: Tokens.s8),
                Flexible(
                  child: Text(
                    '${Money.peso(listing.moveInCost!.totalCentavos)} to move in',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Tokens.accent,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  static IconData _iconFor(ResourceType type) => switch (type) {
        ResourceType.unit => Icons.apartment_outlined,
        ResourceType.room => Icons.meeting_room_outlined,
        ResourceType.bedSpace => Icons.bed_outlined,
        ResourceType.parking => Icons.local_parking_outlined,
        ResourceType.storage => Icons.inventory_2_outlined,
      };
}

class _TourBadge extends StatelessWidget {
  const _TourBadge({required this.sceneCount});

  final int sceneCount;

  @override
  Widget build(BuildContext context) {
    return Glass(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.threed_rotation, size: 15, color: Colors.white),
          const SizedBox(width: Tokens.s6),
          Text(
            '$sceneCount-room tour',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.1,
            ),
          ),
        ],
      ),
    );
  }
}

class _Availability extends StatelessWidget {
  const _Availability({required this.listing});

  final ListingCardView listing;

  @override
  Widget build(BuildContext context) {
    final good = listing.isAvailable;
    final color = good ? Tokens.available : Tokens.taken;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: Tokens.s6),
        Text(
          listing.availabilityLabel,
          style: Theme.of(context)
              .textTheme
              .bodySmall
              ?.copyWith(color: color, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}
