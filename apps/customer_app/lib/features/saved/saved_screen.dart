import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../design/money.dart';
import '../../design/tokens.dart';
import '../../fixtures/sample_data.dart';
import '../../fixtures/view_models.dart';
import '../discovery/widgets/listing_card.dart';
import 'saved_controller.dart';

/// Saved.
///
/// The journey's third stage is **compare**, and what customers compare badly
/// is move-in cost — so the shortlist leads with a side-by-side of what each
/// place actually costs to enter, not another grid of monthly rents.
class SavedScreen extends ConsumerWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final savedIds = ref.watch(savedIdsProvider);
    final saved =
        SampleData.listings.where((l) => savedIds.contains(l.id)).toList();

    final comparable =
        saved.where((l) => l.moveInCost != null).toList();

    return Scaffold(
      body: CustomScrollView(
        physics: Tokens.scroll,
        slivers: [
          SliverSafeArea(
            bottom: false,
            sliver: SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  Tokens.gutter,
                  Tokens.s16,
                  Tokens.gutter,
                  Tokens.s8,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Saved', style: theme.textTheme.displaySmall),
                    if (saved.isNotEmpty)
                      Text(
                        '${saved.length} shortlisted',
                        style: theme.textTheme.bodySmall,
                      ),
                  ],
                ),
              ),
            ),
          ),

          if (saved.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: _EmptySaved(),
            )
          else ...[
            if (comparable.length > 1)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    Tokens.gutter,
                    Tokens.s16,
                    Tokens.gutter,
                    0,
                  ),
                  child: _CompareCard(listings: comparable),
                ),
              ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                Tokens.gutter,
                Tokens.s32,
                Tokens.gutter,
                Tokens.s40,
              ),
              sliver: SliverList.separated(
                itemCount: saved.length,
                separatorBuilder: (_, __) => const SizedBox(height: Tokens.s32),
                itemBuilder: (context, i) => ListingCard(
                  listing: saved[i],
                  onTap: () => context.push(Routes.listing(saved[i].id)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// The comparison the market actually needs: not rent, but entry cost.
class _CompareCard extends StatelessWidget {
  const _CompareCard({required this.listings});

  final List<ListingCardView> listings;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cheapest = listings
        .map((l) => l.moveInCost!.totalCentavos)
        .reduce((a, b) => a < b ? a : b);

    return Container(
      padding: const EdgeInsets.all(Tokens.s20),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(Tokens.rMd),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('WHAT EACH COSTS TO ENTER', style: theme.textTheme.labelSmall),
          const SizedBox(height: Tokens.s16),
          for (final listing in listings) ...[
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        listing.propertyName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodyLarge,
                      ),
                      Text(
                        '${Money.perMonth(listing.priceCentavos)} rent',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: Tokens.s12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      Money.peso(listing.moveInCost!.totalCentavos),
                      style: theme.textTheme.titleMedium?.copyWith(
                        color:
                            listing.moveInCost!.totalCentavos == cheapest
                                ? Tokens.accent
                                : null,
                      ),
                    ),
                    if (listing.moveInCost!.totalCentavos == cheapest)
                      Text(
                        'lowest',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: Tokens.accent,
                        ),
                      ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: Tokens.s16),
          ],
          Text(
            'Monthly rent alone hides the gap. Advance and deposit are '
            'usually three months up front.',
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _EmptySaved extends StatelessWidget {
  const _EmptySaved();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Tokens.s32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.favorite_border,
              size: 40,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: Tokens.s16),
            Text('Nothing saved yet', style: theme.textTheme.headlineSmall),
            const SizedBox(height: Tokens.s8),
            Text(
              'Tap the heart on a listing and it lands here, ready to compare.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
