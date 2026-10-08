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
import '../location/location_controller.dart';
import '../location/location_sheet.dart';
import 'widgets/buy_listing_card.dart';
import 'widgets/discover_header.dart';
import 'widgets/intent_toggle.dart';
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
  void initState() {
    super.initState();
    _controller.addListener(_maybeLoadMore);
  }

  @override
  void dispose() {
    _controller.removeListener(_maybeLoadMore);
    _controller.dispose();
    super.dispose();
  }

  void _maybeLoadMore() {
    if (!_controller.hasClients) return;
    final position = _controller.position;
    if (position.pixels >= position.maxScrollExtent - 600) {
      ref.read(resultsProvider.notifier).loadMore();
    }
  }

  Future<void> _refresh() async {
    ref.invalidate(resultsProvider);
    await ref.read(resultsProvider.future).catchError((_) => const DiscoveryFeedState(items: [], total: 0, hasMore: false));
  }

  void _onCategorySelected(PropertyCategory category) {
    ref.read(selectedCategoryProvider.notifier).state = category;
    context.push(Routes.propertySearch(category.toPropertyType()));
  }

  @override
  Widget build(BuildContext context) {
    final filters = ref.watch(filtersProvider);
    final results = ref.watch(resultsProvider);
    final feed = results.valueOrNull;
    final items = feed?.items ?? const <ListingCardView>[];
    final selectedCategory = ref.watch(selectedCategoryProvider);

    final buy = filters.isBuy;
    final location = ref.watch(locationProvider);
    final nearby = ref.watch(nearbyProvider).valueOrNull ?? const <ListingCardView>[];
    final featuredListings = buy ? const <ListingCardView>[] : items.where((l) => l.hasTour).take(6).toList();

    final isSearching = filters.isFiltered || filters.query.isNotEmpty;
    final placeSuffix = switch (location.place) {
      NearMePlace() => ' near you',
      AreaPlace(:final area) => ' in ${area.cityLabel}',
      AnywherePlace() => '',
    };

    return Scaffold(
      backgroundColor: Tokens.canvas,
      body: RefreshIndicator(
        onRefresh: _refresh,
        color: Tokens.primaryNavy,
        child: CustomScrollView(
        controller: _controller,
        physics: const AlwaysScrollableScrollPhysics(parent: Tokens.scroll),
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
                    IntentToggle(
                      value: filters.intent,
                      onChanged: ref.read(filtersProvider.notifier).setIntent,
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
              child: buy
                  ? BuyCategoryList(
                      selected: filters.buyCategory,
                      onSelected: ref.read(filtersProvider.notifier).setBuyCategory,
                    )
                  : PropertyCategoryList(
                      selected: selectedCategory,
                      onSelected: _onCategorySelected,
                    ),
            ),
          ),
          if (location.place is AnywherePlace && !isSearching)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(Tokens.gutter, 16, Tokens.gutter, 0),
                child: _LocationPrompt(state: location),
              ),
            ),
          if (!isSearching && nearby.isNotEmpty) ...[
            SliverToBoxAdapter(
              child: SectionHeader(
                title: buy ? 'For sale near you' : 'Near you',
                topPadding: 18,
                bottomPadding: 8,
                actionLabel: '',
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 195,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: Tokens.scroll,
                  padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
                  itemCount: nearby.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (context, i) => PropertyCard(
                    listing: nearby[i],
                    onTap: () => context.push(Routes.listing(nearby[i].id)),
                  ),
                ),
              ),
            ),
          ],
          if (!isSearching && featuredListings.isNotEmpty) ...[
            const SliverToBoxAdapter(
              child: SectionHeader(
                title: 'Walk through before you visit',
                topPadding: 18,
                bottomPadding: 8,
                actionLabel: '',
              ),
            ),
            SliverToBoxAdapter(
              child: FeaturedPropertyCarousel(
                listings: featuredListings,
                onTapListing: (listing) =>
                    context.push(Routes.listing(listing.id)),
              ),
            ),
          ],
          SliverToBoxAdapter(
            child: SectionHeader(
              title: isSearching ? 'Results$placeSuffix' : (buy ? 'Properties for sale$placeSuffix' : 'Places to rent$placeSuffix'),
              subtitle: feed == null || feed.total == 0
                  ? null
                  : buy
                      ? '${feed.total} ${feed.total == 1 ? "property" : "properties"}'
                      : '${feed.total} ${feed.total == 1 ? "place" : "places"}',
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
                    itemCount: items.length + 1,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: Tokens.sectionTight),
                    itemBuilder: (context, i) {
                      if (i == items.length) {
                        return _FeedFooter(
                          state: feed!,
                          onRetry: () => ref.read(resultsProvider.notifier).loadMore(),
                        );
                      }
                      return Reveal(
                        order: i.clamp(0, 3),
                        child: items[i].isSale
                            ? BuyListingCard(
                                listing: items[i],
                                onTap: () => context.push(Routes.listing(items[i].id)),
                              )
                            : ListingCard(
                                listing: items[i],
                                onTap: () => context.push(Routes.listing(items[i].id)),
                              ),
                      );
                    },
                  ),
                ),
              ],
          },
        ],
      ),
      ),
    );
  }
}

class _FeedFooter extends StatelessWidget {
  const _FeedFooter({required this.state, required this.onRetry});

  final DiscoveryFeedState state;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (state.loadingMore) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: Tokens.s16),
        child: Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.2))),
      );
    }
    if (state.loadMoreError != null) {
      return Center(
        child: TextButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh, size: 18),
          label: const Text('Couldn’t load more. Try again'),
        ),
      );
    }
    if (state.hasMore) {
      return Center(
        child: TextButton(onPressed: onRetry, child: const Text('Show more places')),
      );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Tokens.s8),
      child: Text(
        'You’ve seen all ${state.total} ${state.total == 1 ? 'place' : 'places'}',
        textAlign: TextAlign.center,
        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
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
            'Try another area, clear a filter, or search a nearby city.',
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

class _LocationPrompt extends ConsumerWidget {
  const _LocationPrompt({required this.state});

  final LocationState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final problem = state.problemMessage;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Tokens.hairline),
      ),
      child: Row(
        children: [
          Icon(
            problem == null
                ? Icons.near_me_outlined
                : Icons.location_off_outlined,
            color: Tokens.primaryNavy,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              problem != null
                  ? 'We couldn’t get your location.'
                  : 'See homes and properties around you.',
              style: const TextStyle(fontSize: 13, color: Tokens.primaryNavy),
            ),
          ),
          const SizedBox(width: 8),
          if (state.locating)
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else if (problem == null)
            TextButton(
              onPressed:
                  ref.read(locationProvider.notifier).useCurrentLocation,
              child: const Text('Use location'),
            )
          else ...[
            TextButton(
              onPressed: () => showLocationSheet(context),
              child: const Text('Choose area'),
            ),
            TextButton(
              onPressed:
                  ref.read(locationProvider.notifier).useCurrentLocation,
              child: const Text('Try again'),
            ),
          ],
        ],
      ),
    );
  }
}
