import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../../design/controls.dart';
import '../../../design/tokens.dart';
import '../../../design/typography.dart';
import '../../location/location_controller.dart';
import '../application/discovery_feeds.dart';
import '../domain/explore_mode.dart';
import '../domain/listing_category.dart';
import 'widgets/category_photo_card.dart';
import 'widgets/explore_concierge_card.dart';
import 'widgets/explore_popular_areas.dart';

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({this.initialMode = ExploreMode.rent, super.key});

  final ExploreMode initialMode;

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  static const double _wideCardHeight = 120;

  late ExploreMode _mode = widget.initialMode;

  void _openCategory(ListingCategory? category, {String? area}) {
    context.push(
      _mode.intent == MarketIntent.buy
          ? Routes.buy(category: category, area: area)
          : category == null
              ? Routes.rent(rentMode: _mode.rentMode, area: area)
              : Routes.stays(category: category, rentMode: _mode.rentMode),
    );
  }

  @override
  Widget build(BuildContext context) {
    final categories = _mode.categories;
    final paired = categories.take(categories.length - categories.length % 2).toList(growable: false);
    final single = categories.length.isOdd ? categories.last : null;
    final allTitle = _mode.intent == MarketIntent.buy ? 'All properties for sale' : 'All rentals';
    return Scaffold(
      backgroundColor: Tokens.canvas,
      body: CustomScrollView(
        physics: Tokens.scroll,
        slivers: [
          SliverSafeArea(
            bottom: false,
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(left: Tokens.s4, top: Tokens.s4),
                    child: context.canPop()
                        ? AppIconButton(
                            icon: Icons.arrow_back_rounded,
                            semanticLabel: 'Back',
                            onPressed: () => context.pop(),
                          )
                        : const SizedBox(height: Tokens.tap),
                  ),
                  const Padding(
                    padding: EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s4, Tokens.gutter, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Explore', style: AppText.hero),
                        SizedBox(height: Tokens.s4),
                        Text('What are you looking for?', style: AppText.supporting),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s20, Tokens.gutter, Tokens.s16),
                    child: _ModeTabs(selected: _mode, onSelected: (mode) => setState(() => _mode = mode)),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
            sliver: SliverGrid.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: Tokens.s12,
                crossAxisSpacing: Tokens.s12,
                childAspectRatio: 1.08,
              ),
              itemCount: paired.length,
              itemBuilder: (context, index) => _categoryCard(paired[index]),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s12, Tokens.gutter, 0),
            sliver: SliverList.list(
              children: [
                if (single != null) ...[
                  SizedBox(height: _wideCardHeight, child: _categoryCard(single)),
                  const SizedBox(height: Tokens.s12),
                ],
                SizedBox(
                  height: _wideCardHeight,
                  child: CategoryPhotoCard(
                    image: ListingCategory.exploreImage,
                    title: allTitle,
                    subtitle: 'Browse every category in one list',
                    onTap: () => _openCategory(null),
                  ),
                ),
              ],
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(top: Tokens.s20),
              child: ExploreConciergeCard(onTap: () => context.push(Routes.contactSupport(topic: 'OTHER'))),
            ),
          ),
          _PopularAreas(
            intent: _mode.intent,
            onSelected: (city, area) {
              ref.read(locationProvider.notifier).chooseCity(city);
              _openCategory(null, area: area);
            },
          ),
          const SliverToBoxAdapter(child: SizedBox(height: Tokens.s40)),
        ],
      ),
    );
  }

  Widget _categoryCard(ListingCategory category) => CategoryPhotoCard(
        image: category.image,
        title: category.labelFor(_mode.intent),
        subtitle: _tagline(category, _mode.intent),
        onTap: () => _openCategory(category),
      );

  static String _tagline(ListingCategory category, MarketIntent intent) => switch ((category, intent)) {
        (ListingCategory.apartment, _) => 'For individuals and small families',
        (ListingCategory.condo, MarketIntent.rent) => 'Units with building amenities',
        (ListingCategory.condo, MarketIntent.buy) => 'Ready and pre-selling units',
        (ListingCategory.house, MarketIntent.rent) => 'Room to grow for your family',
        (ListingCategory.house, MarketIntent.buy) => 'Homes with their own lot',
        (ListingCategory.room, _) => 'Private rooms at friendlier rates',
        (ListingCategory.boardingHouse, _) => 'Budget-friendly shared living',
        (ListingCategory.townhouse, _) => 'Multi-level homes in communities',
        (ListingCategory.lot, _) => 'Land for your future plans',
        (ListingCategory.commercial, _) => 'Spaces for your business',
      };
}

class _ModeTabs extends StatelessWidget {
  const _ModeTabs({required this.selected, required this.onSelected});

  final ExploreMode selected;
  final ValueChanged<ExploreMode> onSelected;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final mode in ExploreMode.values) ...[
          if (mode != ExploreMode.values.first) const SizedBox(width: Tokens.s8),
          Expanded(
            child: Semantics(
              button: true,
              selected: mode == selected,
              label: mode.label,
              excludeSemantics: true,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  if (mode == selected) return;
                  HapticFeedback.selectionClick();
                  onSelected(mode);
                },
                child: AnimatedContainer(
                  duration: Tokens.quick,
                  height: Tokens.segmentedHeight,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: mode == selected ? Tokens.primaryNavy : Colors.white,
                    borderRadius: BorderRadius.circular(Tokens.rControl),
                    border: Border.all(color: mode == selected ? Tokens.primaryNavy : Tokens.hairline),
                  ),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: Tokens.s4),
                      child: Text(
                        mode.label,
                        maxLines: 1,
                        style: AppText.fieldValue.copyWith(
                          color: mode == selected ? Tokens.canvas : Tokens.primaryNavy,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _PopularAreas extends ConsumerWidget {
  const _PopularAreas({required this.intent, required this.onSelected});

  final MarketIntent intent;
  final void Function(String city, String area) onSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final areas = ref.watch(popularAreasProvider(intent)).valueOrNull ?? const [];
    if (areas.isEmpty) return const SliverToBoxAdapter(child: SizedBox.shrink());
    return SliverToBoxAdapter(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppSectionHeader(title: intent == MarketIntent.buy ? 'Popular areas to buy' : 'Popular areas to rent'),
          ExplorePopularAreas(
            areas: areas,
            onAreaSelected: (area) => onSelected(area.cityLabel, area.areaLabel),
          ),
        ],
      ),
    );
  }
}
