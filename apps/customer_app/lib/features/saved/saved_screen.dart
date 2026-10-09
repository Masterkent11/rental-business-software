import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/listing_repository.dart';
import '../../design/app_image.dart';
import '../../design/money.dart';
import '../../design/motion.dart';
import '../../design/tokens.dart';
import '../../fixtures/view_models.dart';
import '../listing/listing_price.dart';
import 'saved_controller.dart';

class SavedScreen extends ConsumerStatefulWidget {
  const SavedScreen({super.key});

  @override
  ConsumerState<SavedScreen> createState() => _SavedScreenState();
}

class _SavedScreenState extends ConsumerState<SavedScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final savedAsync = ref.watch(savedListingsProvider);
    final saved = savedAsync.valueOrNull ?? const <ListingCardView>[];

    final comparable = saved.where((l) => l.moveInCost != null).toList();

    final body = savedAsync.hasError
        ? SliverFillRemaining(
            hasScrollBody: false,
            child: _SavedError(
              message: '${savedAsync.error}',
              onRetry: () => ref.invalidate(savedListingsProvider),
            ),
          )
        : savedAsync.isLoading
            ? const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator()),
              )
            : _tab == 1
                ? const SliverFillRemaining(
                    hasScrollBody: false,
                    child: _EmptySavedSearches(),
                  )
                : saved.isEmpty
                    ? const SliverFillRemaining(
                        hasScrollBody: false,
                        child: _EmptySaved(),
                      )
                    : null;

    return Scaffold(
      backgroundColor: Tokens.canvas,
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
                    const SizedBox(height: Tokens.s16),
                    Container(
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F4F8),
                        borderRadius: BorderRadius.circular(Tokens.rSm),
                      ),
                      padding: const EdgeInsets.all(4),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _tab = 0),
                              child: Container(
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: _tab == 0 ? Tokens.primaryNavy : Colors.transparent,
                                  borderRadius: BorderRadius.circular(Tokens.rSm - 2),
                                ),
                                child: Text(
                                  'Properties',
                                  style: TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w600,
                                    color: _tab == 0 ? Colors.white : Tokens.primaryNavy,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _tab = 1),
                              child: Container(
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: _tab == 1 ? Tokens.primaryNavy : Colors.transparent,
                                  borderRadius: BorderRadius.circular(Tokens.rSm - 2),
                                ),
                                child: Text(
                                  'Searches',
                                  style: TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w600,
                                    color: _tab == 1 ? Colors.white : Tokens.primaryNavy,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (body != null)
            body
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
                Tokens.s16,
                Tokens.gutter,
                Tokens.s40,
              ),
              sliver: SliverList.separated(
                itemCount: saved.length,
                separatorBuilder: (_, __) => const SizedBox(height: Tokens.s16),
                itemBuilder: (context, i) => Reveal(
                  order: i.clamp(0, 3),
                  child: _SavedListingCard(
                    listing: saved[i],
                    onTap: () => context.push(Routes.listing(saved[i].id)),
                    onToggleSave: () => ref.read(savedIdsProvider.notifier).toggle(saved[i].id),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _CompareCard extends StatelessWidget {
  const _CompareCard({required this.listings});

  final List<ListingCardView> listings;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cheapest = listings.map((l) => l.moveInCost!.totalCentavos).reduce((a, b) => a < b ? a : b);

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
                        listing.isSale ? kPriceOnInquiry : listingPriceLabel(listing),
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
                        color: listing.moveInCost!.totalCentavos == cheapest ? Tokens.accent : null,
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

class _SavedError extends StatelessWidget {
  const _SavedError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Tokens.s32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Could not load your saved listings',
              style: theme.textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Tokens.s8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: Tokens.s16),
            FilledButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ),
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

class _EmptySavedSearches extends StatelessWidget {
  const _EmptySavedSearches();

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
              Icons.saved_search_outlined,
              size: 44,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: Tokens.s16),
            Text('No saved searches yet', style: theme.textTheme.headlineSmall),
            const SizedBox(height: Tokens.s8),
            Text(
              'Save your searches to get notified when new matching properties are listed.',
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

class _SavedListingCard extends StatelessWidget {
  const _SavedListingCard({
    required this.listing,
    required this.onTap,
    required this.onToggleSave,
  });

  final ListingCardView listing;
  final VoidCallback onTap;
  final VoidCallback onToggleSave;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(Tokens.rMd),
          border: Border.all(color: Tokens.hairline),
        ),
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(Tokens.rSm),
              child: SizedBox(
                width: 110,
                height: 105,
                child: AppImage(
                  url: listing.photos.firstOrNull ?? '',
                  fit: BoxFit.cover,
                  fallbackIcon: Icons.apartment_outlined,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          listing.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Tokens.primaryNavy,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: onToggleSave,
                        child: const Icon(
                          Icons.favorite,
                          size: 20,
                          color: Tokens.primaryNavy,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    [listing.place, if (listing.propertyName.isNotEmpty) listing.propertyName].join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: Tokens.muted,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          listing.isSale ? kPriceOnInquiry : listingPriceLabel(listing),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: Tokens.primaryNavy,
                          ),
                        ),
                      ),
                      const Icon(Icons.more_horiz, size: 20, color: Tokens.muted),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.bed_outlined, size: 14, color: Tokens.muted),
                      const SizedBox(width: 3),
                      Text(
                        '${listing.beds} Beds',
                        style: const TextStyle(fontSize: 11.5, color: Tokens.muted),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.bathtub_outlined, size: 14, color: Tokens.muted),
                      const SizedBox(width: 3),
                      Text(
                        '${listing.baths} Baths',
                        style: const TextStyle(fontSize: 11.5, color: Tokens.muted),
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.aspect_ratio, size: 14, color: Tokens.muted),
                      const SizedBox(width: 3),
                      Text(
                        '${listing.sqm ?? 0} sqm',
                        style: const TextStyle(fontSize: 11.5, color: Tokens.muted),
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
