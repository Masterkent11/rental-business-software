import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/discovery_repository.dart';
import '../../design/components.dart';
import '../../design/controls.dart';
import '../../design/motion.dart';
import '../../design/tokens.dart';
import '../../fixtures/view_models.dart';
import '../editorial/application/editorial_content.dart';
import '../editorial/domain/editorial_card.dart';
import '../editorial/presentation/editorial_carousel.dart';
import '../editorial/presentation/editorial_routes.dart';
import '../explore/application/discovery_feeds.dart';
import '../explore/domain/explore_query.dart';
import '../explore/domain/listing_category.dart';
import '../location/location_controller.dart';
import '../location/location_sheet.dart';
import 'home_shortcut.dart';
import 'widgets/discover_header.dart';
import 'widgets/property_card.dart';

class DiscoveryScreen extends ConsumerWidget {
  const DiscoveryScreen({super.key});

  static const RecommendationKey _rentKey = (intent: MarketIntent.rent, category: null);
  static const RecommendationKey _buyKey = (intent: MarketIntent.buy, category: null);
  static const EditorialSlot _heroSlot = (placement: EditorialPlacement.home, category: null);

  Future<void> _refresh(WidgetRef ref) async {
    ref
      ..invalidate(recommendationsProvider)
      ..invalidate(tourListingsProvider);
    await Future.wait([
      ref.read(recommendationsProvider(_rentKey).future).then((_) {}, onError: (_) {}),
      ref.read(recommendationsProvider(_buyKey).future).then((_) {}, onError: (_) {}),
    ]);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = ref.watch(locationProvider);
    final rent = ref.watch(recommendationsProvider(_rentKey));
    final buy = ref.watch(recommendationsProvider(_buyKey));
    final bothFailed = rent.hasError && buy.hasError && !rent.hasValue && !buy.hasValue;

    return Scaffold(
      backgroundColor: Tokens.canvas,
      body: RefreshIndicator(
        onRefresh: () => _refresh(ref),
        color: Tokens.primaryNavy,
        child: CustomScrollView(
          physics: Tokens.scroll,
          slivers: [
            SliverSafeArea(
              bottom: false,
              sliver: SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Reveal(child: DiscoverHeader()),
                      const SizedBox(height: Tokens.s16),
                      Reveal(
                        order: 1,
                        child: Row(
                          children: [
                            Expanded(
                              child: AppSearchField(
                                hint: 'Search area, landmark or property',
                                readOnly: true,
                                onTap: () => context.push(Routes.rent(search: true)),
                              ),
                            ),
                            const SizedBox(width: Tokens.s8),
                            AppFilterButton(onPressed: () => context.push(Routes.explore())),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Reveal(
                order: 2,
                child: Padding(
                  padding: const EdgeInsets.only(top: Tokens.s16),
                  child: HomeCategoryRow(
                    onSelected: (shortcut) => context.push(
                      shortcut.intent == MarketIntent.buy ? Routes.buy() : Routes.stays(category: shortcut.category),
                    ),
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.only(top: Tokens.s20),
                child: EditorialCarousel(
                  cards: ref.watch(editorialCardsProvider(_heroSlot)),
                  footnote: location.cityContext,
                  onAction: (action) => context.push(editorialRoute(action)),
                ),
              ),
            ),
            if (!location.isSpecified || location.problem != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s16, Tokens.gutter, 0),
                  child: LocationPrompt(state: location),
                ),
              ),
            if (bothFailed)
              SliverToBoxAdapter(
                child: ErrorState(
                  title: 'Couldn’t load places',
                  message: 'Check your connection and try again.',
                  onRetry: () => ref.invalidate(recommendationsProvider),
                ),
              )
            else ...[
              _RecommendationRow(
                async: rent,
                titleFor: (scope) => switch (scope) {
                  RecommendationScope.nearby => 'Near you',
                  RecommendationScope.city => 'Homes in ${location.cityContext ?? 'your area'}',
                  RecommendationScope.broad => 'Recommended for you',
                },
                onSeeAll: () => context.push(Routes.rent()),
              ),
              _RecommendationRow(
                async: buy,
                titleFor: (scope) => scope == RecommendationScope.broad ? 'Properties for sale' : 'For sale near you',
                onSeeAll: () => context.push(Routes.buy()),
              ),
              _TourRow(onSeeAll: () => context.push(Routes.rent(filter: QuickFilter.virtualTour))),
            ],
            const SliverToBoxAdapter(child: SizedBox(height: Tokens.s40)),
          ],
        ),
      ),
    );
  }
}

class HomeCategoryRow extends StatelessWidget {
  const HomeCategoryRow({required this.onSelected, super.key});

  final ValueChanged<HomeShortcut> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: Tokens.categoryTileHeight,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: Tokens.scroll,
        padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
        itemCount: HomeShortcut.values.length,
        separatorBuilder: (_, __) => const SizedBox(width: Tokens.s12),
        itemBuilder: (context, index) {
          final shortcut = HomeShortcut.values[index];
          return CategoryTile(icon: shortcut.icon, label: shortcut.label, onTap: () => onSelected(shortcut));
        },
      ),
    );
  }
}

class LocationPrompt extends ConsumerWidget {
  const LocationPrompt({required this.state, super.key});

  final LocationState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final problem = state.problemMessage;
    return AppInlineNotice(
      icon: problem == null ? Icons.near_me_outlined : Icons.location_off_outlined,
      message: problem ?? 'See homes and properties around you.',
      trailing: state.locating
          ? const Padding(
              padding: EdgeInsets.all(Tokens.s12),
              child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
            )
          : problem == null
              ? AppTextAction(label: 'Use location', onPressed: ref.read(locationProvider.notifier).useCurrentLocation)
              : AppTextAction(label: 'Choose area', onPressed: () => showLocationSheet(context)),
    );
  }
}

class _RecommendationRow extends StatelessWidget {
  const _RecommendationRow({required this.async, required this.titleFor, required this.onSeeAll});

  final AsyncValue<Recommendations> async;
  final String Function(RecommendationScope scope) titleFor;
  final VoidCallback onSeeAll;

  @override
  Widget build(BuildContext context) {
    final value = async.valueOrNull;
    if (value != null && value.items.isEmpty) return const SliverToBoxAdapter(child: SizedBox.shrink());
    if (async.hasError && value == null) return const SliverToBoxAdapter(child: SizedBox.shrink());
    return SliverToBoxAdapter(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppSectionHeader(
            title: value == null ? 'Recommended for you' : titleFor(value.scope),
            actionLabel: 'See all',
            onAction: onSeeAll,
          ),
          _CardRow(items: value?.items),
        ],
      ),
    );
  }
}

class _TourRow extends ConsumerWidget {
  const _TourRow({required this.onSeeAll});

  final VoidCallback onSeeAll;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(tourListingsProvider).valueOrNull;
    if (items == null || items.isEmpty) return const SliverToBoxAdapter(child: SizedBox.shrink());
    return SliverToBoxAdapter(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppSectionHeader(
            title: 'Walk through with 360° tours',
            subtitle: 'Look around before you visit',
            actionLabel: 'See all',
            onAction: onSeeAll,
          ),
          _CardRow(items: items),
        ],
      ),
    );
  }
}

class _CardRow extends StatelessWidget {
  const _CardRow({required this.items});

  final List<ListingCardView>? items;

  @override
  Widget build(BuildContext context) {
    final list = items;
    return SizedBox(
      height: 196,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: list == null ? const NeverScrollableScrollPhysics() : Tokens.scroll,
        padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
        itemCount: list?.length ?? 3,
        separatorBuilder: (_, __) => const SizedBox(width: Tokens.s12),
        itemBuilder: (context, i) => list == null
            ? const SkeletonBox(width: 160, height: 190, radius: Tokens.rControl)
            : PropertyCard(listing: list[i], onTap: () => context.push(Routes.listing(list[i].id))),
      ),
    );
  }
}
