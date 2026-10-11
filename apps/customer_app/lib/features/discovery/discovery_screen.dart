import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/discovery_repository.dart';
import '../../design/components.dart';
import '../../design/controls.dart';
import '../../design/seasonal_header_background.dart';
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
    final topPadding = MediaQuery.paddingOf(context).top;
    final screenWidth = MediaQuery.sizeOf(context).width;

    return Scaffold(
      backgroundColor: Tokens.canvas,
      body: RefreshIndicator(
        onRefresh: () => _refresh(ref),
        color: Tokens.primaryNavy,
        child: CustomScrollView(
          physics: Tokens.scroll,
          slivers: [
            SliverPersistentHeader(
              pinned: true,
              delegate: _HomeHeaderDelegate(
                topPadding: topPadding,
                screenWidth: screenWidth,
                onShortcutSelected: (shortcut) => context.push(
                  shortcut.intent == MarketIntent.buy
                      ? Routes.buy()
                      : Routes.stays(category: shortcut.category),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.only(top: Tokens.s8),
                child: EditorialCarousel(
                  aspectRatio: (screenWidth - 32) / 236.0,
                  cards: ref.watch(editorialCardsProvider(_heroSlot)),
                  footnote: location.cityContext,
                  onAction: (action) => context.push(editorialRoute(action)),
                ),
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
            const SliverToBoxAdapter(child: SizedBox(height: 110)),
          ],
        ),
      ),
    );
  }
}

class _HomeHeaderDelegate extends SliverPersistentHeaderDelegate {
  _HomeHeaderDelegate({
    required this.topPadding,
    required this.screenWidth,
    required this.onShortcutSelected,
  });

  final double topPadding;
  final double screenWidth;
  final ValueChanged<HomeShortcut> onShortcutSelected;

  @override
  double get minExtent => topPadding + 60.0;

  @override
  double get maxExtent => topPadding + 162.0;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    final collapseProgress = ((shrinkOffset) / (maxExtent - minExtent)).clamp(0.0, 1.0);
    final winterVisible = collapseProgress < 1.0;

    return Stack(
      fit: StackFit.expand,
      children: [
        if (winterVisible) ...[
          Positioned.fill(
            child: Opacity(
              opacity: (1.0 - collapseProgress * 1.25).clamp(0.0, 1.0),
              child: const SeasonalHeaderBackground(),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: 32,
            child: Opacity(
              opacity: (1.0 - collapseProgress).clamp(0.0, 1.0),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Tokens.canvas.withValues(alpha: 0),
                      Tokens.canvas,
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
        Positioned.fill(
          child: Opacity(
            opacity: collapseProgress,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(
                  bottom: BorderSide(
                    color: const Color(0xFFE5E7EB).withValues(alpha: collapseProgress),
                    width: 0.8,
                  ),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Color.fromRGBO(0, 0, 0, 0.04 * collapseProgress),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (winterVisible)
          Positioned(
            top: topPadding + 62,
            left: 0,
            right: 0,
            child: Opacity(
              opacity: (1.0 - collapseProgress * 2.2).clamp(0.0, 1.0),
              child: Transform.translate(
                offset: Offset(0, -12 * collapseProgress),
                child: IgnorePointer(
                  ignoring: collapseProgress > 0.2,
                  child: HomeCategoryRow(onSelected: onShortcutSelected),
                ),
              ),
            ),
          ),
        Positioned(
          top: topPadding + 8,
          left: 16,
          right: 16,
          height: 44,
          child: const DiscoverHeader(),
        ),
      ],
    );
  }

  @override
  bool shouldRebuild(covariant _HomeHeaderDelegate oldDelegate) {
    return topPadding != oldDelegate.topPadding ||
        screenWidth != oldDelegate.screenWidth ||
        onShortcutSelected != oldDelegate.onShortcutSelected;
  }
}

class HomeCategoryRow extends StatelessWidget {
  const HomeCategoryRow({required this.onSelected, super.key});

  final ValueChanged<HomeShortcut> onSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: Tokens.scroll,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _CategoryItem(
            label: 'Apartment',
            svgIcon: HomeShortcut.apartment.icon,
            onTap: () => onSelected(HomeShortcut.apartment),
          ),
          const SizedBox(width: 8),
          _CategoryItem(
            label: 'Condo',
            svgIcon: HomeShortcut.condo.icon,
            onTap: () => onSelected(HomeShortcut.condo),
          ),
          const SizedBox(width: 8),
          _CategoryItem(
            label: 'House',
            svgIcon: HomeShortcut.house.icon,
            onTap: () => onSelected(HomeShortcut.house),
          ),
          const SizedBox(width: 8),
          _CategoryItem(
            label: 'Room',
            svgIcon: HomeShortcut.room.icon,
            onTap: () => onSelected(HomeShortcut.room),
          ),
          const SizedBox(width: 8),
          _CategoryItem(
            label: 'Boarding',
            testLabel: 'Boarding House',
            svgIcon: HomeShortcut.boardingHouse.icon,
            onTap: () => onSelected(HomeShortcut.boardingHouse),
          ),
          const SizedBox(width: 8),
          _CategoryItem(
            label: 'Buy',
            svgIcon: HomeShortcut.buy.icon,
            onTap: () => onSelected(HomeShortcut.buy),
          ),
        ],
      ),
    );
  }
}

class _CategoryItem extends StatelessWidget {
  const _CategoryItem({
    required this.label,
    required this.svgIcon,
    required this.onTap,
    this.testLabel,
  });

  final String label;
  final String? testLabel;
  final String svgIcon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: SizedBox(
          width: 66,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.white.withValues(alpha: 0.68),
                      Colors.white.withValues(alpha: 0.42),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.34),
                    width: 0.8,
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x05142642),
                      blurRadius: 8,
                      offset: Offset(0, 1),
                    ),
                  ],
                ),
                child: Center(
                  child: SvgPicture.asset(
                    svgIcon,
                    width: 58,
                    height: 58,
                    fit: BoxFit.contain,
                    excludeFromSemantics: true,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Stack(
                alignment: Alignment.center,
                children: [
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF142642),
                    ),
                  ),
                  if (testLabel != null)
                    Opacity(
                      opacity: 0.0,
                      child: Text(
                        testLabel!,
                        maxLines: 1,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
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
    final cardWidth = (MediaQuery.sizeOf(context).width - 32) * 0.88;

    return SizedBox(
      height: 278,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: list == null ? const NeverScrollableScrollPhysics() : Tokens.scroll,
        padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
        itemCount: list?.length ?? 3,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, i) => list == null
            ? SkeletonBox(width: cardWidth, height: 260, radius: 16)
            : PropertyCard(
                listing: list[i],
                width: cardWidth,
                onTap: () => context.push(Routes.listing(list[i].id)),
              ),
      ),
    );
  }
}
