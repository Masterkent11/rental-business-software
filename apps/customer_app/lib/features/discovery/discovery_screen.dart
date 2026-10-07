import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../design/motion.dart';
import '../../design/tokens.dart';
import '../../fixtures/view_models.dart';
import 'discovery_controller.dart';
import 'filters_sheet.dart';
import 'widgets/discover_header.dart';
import 'widgets/featured_card.dart';
import 'widgets/listing_card.dart';
import 'widgets/property_card.dart';
import 'widgets/quick_category_chips.dart';
import 'widgets/search_panel.dart';
import 'widgets/section_header.dart';

final selectedCategoryProvider = StateProvider<PropertyCategory>(
  (ref) => PropertyCategory.apartment,
);

class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen> {
  final _controller = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onCategorySelected(PropertyCategory category) {
    ref.read(selectedCategoryProvider.notifier).state = category;
    context.push(Routes.propertySearch(category.toPropertyType()));
  }

  @override
  Widget build(BuildContext context) {
    final filters = ref.watch(filtersProvider);
    final results = ref.watch(resultsProvider);
    final items = results.valueOrNull ?? const <ListingCardView>[];
    final selectedCategory = ref.watch(selectedCategoryProvider);

    final featured = items.where((l) => l.isPopular || l.hasTour).toList();
    final featuredListings =
        featured.isNotEmpty ? featured : items.take(4).toList();

    final nearYou = items
        .where((l) =>
            l.cityLabel.toLowerCase().contains('cebu') ||
            l.areaLabel.isNotEmpty)
        .toList();
    final nearYouListings = nearYou.isNotEmpty ? nearYou : items;

    final isSearching = filters.isFiltered || filters.query.isNotEmpty;

    return Scaffold(
      backgroundColor: Tokens.canvas,
      body: CustomScrollView(
        controller: _controller,
        physics: Tokens.scroll,
        slivers: [
          SliverSafeArea(
            bottom: false,
            sliver: SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  Tokens.gutter,
                  Tokens.s12,
                  Tokens.gutter,
                  0,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Reveal(
                      child: DiscoverHeader(),
                    ),
                    const SizedBox(height: 12),
                    Reveal(
                      order: 1,
                      child: SearchPanel(
                        onSearch: () => _controller.animateTo(
                          340,
                          duration: Tokens.slow,
                          curve: Tokens.ease,
                        ),
                        onFilter: () => showFiltersSheet(context),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Reveal(
              order: 2,
              child: PropertyCategoryList(
                selected: selectedCategory,
                onSelected: _onCategorySelected,
              ),
            ),
          ),
          if (!isSearching) ...[
            SliverToBoxAdapter(
              child: SectionHeader(
                title: 'Featured for You',
                topPadding: 18,
                bottomPadding: 8,
                onAction: () => _controller.animateTo(
                  400,
                  duration: Tokens.slow,
                  curve: Tokens.ease,
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: FeaturedPropertyCarousel(
                listings: featuredListings,
                onTapListing: (listing) =>
                    context.push(Routes.listing(listing.id)),
              ),
            ),
            SliverToBoxAdapter(
              child: SectionHeader(
                title: 'Near You',
                topPadding: 18,
                bottomPadding: 8,
                onAction: () => _controller.animateTo(
                  700,
                  duration: Tokens.slow,
                  curve: Tokens.ease,
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 195,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: Tokens.scroll,
                  padding:
                      const EdgeInsets.symmetric(horizontal: Tokens.gutter),
                  itemCount: nearYouListings.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (context, i) => PropertyCard(
                    listing: nearYouListings[i],
                    onTap: () =>
                        context.push(Routes.listing(nearYouListings[i].id)),
                  ),
                ),
              ),
            ),
          ],
          SliverToBoxAdapter(
            child: SectionHeader(
              title: isSearching ? 'Results' : 'All rentals',
              subtitle: items.isEmpty
                  ? null
                  : '${items.length} ${items.length == 1 ? "place" : "places"}',
              topPadding: isSearching ? 18 : 22,
              bottomPadding: 12,
              actionLabel: isSearching ? 'Clear' : '',
              onAction: isSearching
                  ? () {
                      ref.read(filtersProvider.notifier).clear();
                      ref.read(selectedCategoryProvider.notifier).state =
                          PropertyCategory.apartment;
                    }
                  : null,
            ),
          ),
          ...switch (results) {
            AsyncError(:final error) => [
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: _LoadFailed(
                    error: error,
                    onRetry: () => ref.invalidate(resultsProvider),
                  ),
                ),
              ],
            AsyncLoading() when items.isEmpty => [
                const SliverToBoxAdapter(child: _ResultsSkeleton()),
              ],
            _ when items.isEmpty => [
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: _EmptyResults(),
                ),
              ],
            _ => [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(
                    Tokens.gutter,
                    0,
                    Tokens.gutter,
                    Tokens.s64,
                  ),
                  sliver: SliverList.separated(
                    itemCount: items.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: Tokens.sectionTight),
                    itemBuilder: (context, i) => Reveal(
                      order: i.clamp(0, 3),
                      child: ListingCard(
                        listing: items[i],
                        onTap: () => context.push(Routes.listing(items[i].id)),
                      ),
                    ),
                  ),
                ),
              ],
          },
        ],
      ),
    );
  }
}

class _EmptyResults extends ConsumerWidget {
  const _EmptyResults();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        Tokens.s32,
        Tokens.s16,
        Tokens.s32,
        Tokens.s40,
      ),
      child: Column(
        children: [
          Text(
            'Nothing matches that yet',
            style: theme.textTheme.headlineSmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: Tokens.s8),
          Text(
            'Try widening the budget, or look at a nearby barangay — '
            'Kamputhaw and Mabolo usually have more listings.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: Tokens.s20),
          FilledButton(
            onPressed: () {
              ref.read(filtersProvider.notifier).clear();
              ref.read(selectedCategoryProvider.notifier).state =
                  PropertyCategory.apartment;
            },
            child: const Text('Clear filters'),
          ),
        ],
      ),
    );
  }
}

class _ResultsSkeleton extends StatelessWidget {
  const _ResultsSkeleton();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        Tokens.gutter,
        0,
        Tokens.gutter,
        Tokens.s40,
      ),
      child: Column(
        children: [
          for (var i = 0; i < 3; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: Tokens.s32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AspectRatio(
                    aspectRatio: 4 / 3,
                    child: Container(
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(Tokens.rLg),
                      ),
                    ),
                  ),
                  const SizedBox(height: Tokens.s12),
                  Container(
                    height: 14,
                    width: 220,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: Tokens.s8),
                  Container(
                    height: 12,
                    width: 140,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _LoadFailed extends StatelessWidget {
  const _LoadFailed({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final message = error is ApiException
        ? (error as ApiException).message
        : 'Something went wrong loading places.';

    return Center(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          Tokens.s32,
          Tokens.s16,
          Tokens.s32,
          Tokens.s40,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.cloud_off_outlined,
              size: 40,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: Tokens.s16),
            Text(
              'Could not load places',
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
            const SizedBox(height: Tokens.s20),
            SizedBox(
              width: 200,
              child: FilledButton(
                onPressed: onRetry,
                child: const Text('Try again'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
