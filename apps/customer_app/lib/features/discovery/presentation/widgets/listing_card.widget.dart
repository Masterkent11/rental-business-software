import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/design/app_image.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/domain/value_objects/money.value_object.dart';
import '../../../listings/domain/entities/listing.entity.dart';
import '../../../listings/domain/value_objects/listing_kind.value_object.dart';
import '../../../saved/presentation/controllers/saved.controller.dart';

class ListingCard extends ConsumerWidget {
  const ListingCard({
    required this.listing,
    super.key,
  });

  final Listing listing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isLongTerm = listing.kind == ListingKind.longTerm;
    final isSaved = ref.watch(isSavedProvider(listing.id));

    return InkWell(
      onTap: () => context.push('/listing/${listing.id}', extra: listing),
      borderRadius: Tokens.borderLg,
      child: Container(
        decoration: BoxDecoration(
          color: Tokens.surface,
          borderRadius: Tokens.borderLg,
          border: Border.all(color: Tokens.line),
          boxShadow: Tokens.shadowSm,
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                if (listing.photos.isNotEmpty)
                  AppImage(url: listing.photos.first, height: 200, width: double.infinity)
                else
                  Container(height: 200, color: Tokens.surfaceSubtle),
                Positioned(
                  top: 12,
                  right: 12,
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: Tokens.surface.withOpacity(0.8),
                    child: IconButton(
                      icon: Icon(
                        isSaved ? Icons.favorite : Icons.favorite_border,
                        size: 18,
                        color: isSaved ? Tokens.danger : Tokens.ink,
                      ),
                      onPressed: () {
                        ref.read(savedIdsProvider.notifier).toggle(listing.id);
                      },
                    ),
                  ),
                ),
                if (listing.hasTour)
                  Positioned(
                    bottom: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Tokens.ink.withOpacity(0.8),
                        borderRadius: Tokens.borderXs,
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.view_in_ar, size: 14, color: Tokens.surface),
                          SizedBox(width: 4),
                          Text(
                            '360° TOUR',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Tokens.surface),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(Tokens.s16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          listing.resourceType.label,
                          style: theme.textTheme.labelSmall?.copyWith(color: Tokens.inkMuted),
                        ),
                      ),
                      Text(
                        listing.availabilityLabel,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Tokens.accent),
                      ),
                    ],
                  ),
                  const SizedBox(height: Tokens.s6),
                  Text(
                    listing.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: Tokens.s4),
                  Text(
                    '${listing.propertyName} · ${listing.location}',
                    style: theme.textTheme.bodySmall?.copyWith(color: Tokens.inkMuted),
                  ),
                  const SizedBox(height: Tokens.s12),
                  Row(
                    children: [
                      Text(
                        Money.formatPesos(listing.priceCentavos),
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        isLongTerm ? ' / month' : ' / night',
                        style: theme.textTheme.bodySmall?.copyWith(color: Tokens.inkMuted),
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
