import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../design/tokens.dart';
import '../../fixtures/sample_data.dart';
import '../../fixtures/view_models.dart';
import 'discovery_controller.dart';
import 'filters_sheet.dart';
import 'widgets/featured_card.dart';
import 'widgets/listing_card.dart';

/// Discover — the entry point of the whole product.
///
/// The customer arrives with a need and a budget, and the journey names what
/// they must believe: **that these listings are real and current.** Everything
/// on this screen serves that — availability copy on every card, the move-in
/// cost stated up front, and the tour badge as the first sign that a place can
/// be judged without a trip across the city.
class DiscoveryScreen extends ConsumerWidget {
  const DiscoveryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final filters = ref.watch(filtersProvider);
    final results = ref.watch(resultsProvider);
    final lens = ref.watch(featuredLensProvider);
    final featured = SampleData.featuredFor(lens);

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
                  0,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.location_on,
                                    size: 16,
                                    color: theme.colorScheme.onSurfaceVariant,
                                  ),
                                  const SizedBox(width: Tokens.s4),
                                  Text(
                                    'Cebu City',
                                    style: theme.textTheme.bodySmall,
                                  ),
                                ],
                              ),
                              const SizedBox(height: Tokens.s4),
                              Text(
                                'Find a place',
                                style: theme.textTheme.displaySmall,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: Tokens.s12),
                        // Both carry unread counts. A bell with no badge is
                        // decoration; the count is the only reason to look.
                        _HeaderAction(
                          icon: Icons.chat_bubble_outline,
                          unread: 2,
                          tooltip: 'Messages',
                          onTap: () => context.push(Routes.messages),
                        ),
                        const SizedBox(width: Tokens.s8),
                        _HeaderAction(
                          icon: Icons.notifications_none,
                          unread: 3,
                          tooltip: 'Notifications',
                          onTap: () => context.push(Routes.notifications),
                        ),
                      ],
                    ),
                    const SizedBox(height: Tokens.s20),
                    _SearchRow(
                      query: filters.query,
                      activeFilters: filters.activeCount,
                      onChanged: ref.read(filtersProvider.notifier).setQuery,
                      onFilters: () => showFiltersSheet(context),
                    ),
                  ],
                ),
              ),
            ),
          ),

          if (!filters.isFiltered && filters.query.isEmpty) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  Tokens.gutter,
                  Tokens.s24,
                  Tokens.gutter,
                  0,
                ),
                child: _LensRow(
                  selected: lens,
                  onSelected: (value) =>
                      ref.read(featuredLensProvider.notifier).state = value,
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: _SectionHeader(
                tight: true,
                title: switch (lens) {
                  FeaturedLens.popular => 'Worth a walkthrough',
                  FeaturedLens.nearby => 'Close to you',
                  FeaturedLens.recommendation => 'Picked for you',
                },
                caption: switch (lens) {
                  FeaturedLens.popular =>
                    'Places you can judge without the trip',
                  FeaturedLens.nearby => 'Nearest first, around Cebu City',
                  FeaturedLens.recommendation =>
                    'Based on what you have saved and toured',
                },
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 240,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: Tokens.scroll,
                  padding: const EdgeInsets.symmetric(
                    horizontal: Tokens.gutter,
                  ),
                  itemCount: featured.length,
                  separatorBuilder: (_, __) => const SizedBox(width: Tokens.s12),
                  itemBuilder: (context, i) => FeaturedCard(
                    listing: featured[i],
                    onTap: () => context.push(Routes.listing(featured[i].id)),
                  ),
                ),
              ),
            ),
          ],

          SliverToBoxAdapter(
            child: _SectionHeader(
              title: filters.isFiltered || filters.query.isNotEmpty
                  ? 'Results'
                  : 'All rentals',
              caption: results.isEmpty
                  ? null
                  : '${results.length} ${results.length == 1 ? "place" : "places"}',
            ),
          ),

          if (results.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: _EmptyResults(),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                Tokens.gutter,
                0,
                Tokens.gutter,
                Tokens.s40,
              ),
              sliver: SliverList.separated(
                itemCount: results.length,
                separatorBuilder: (_, __) => const SizedBox(height: Tokens.s32),
                itemBuilder: (context, i) => ListingCard(
                  listing: results[i],
                  onTap: () => context.push(Routes.listing(results[i].id)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _SearchRow extends StatelessWidget {
  const _SearchRow({
    required this.query,
    required this.activeFilters,
    required this.onChanged,
    required this.onFilters,
  });

  final String query;
  final int activeFilters;
  final ValueChanged<String> onChanged;
  final VoidCallback onFilters;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Expanded(
          child: TextField(
            onChanged: onChanged,
            textInputAction: TextInputAction.search,
            style: theme.textTheme.bodyLarge,
            decoration: InputDecoration(
              hintText: 'Barangay, city, or property',
              prefixIcon: Icon(
                Icons.search,
                size: 20,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              prefixIconConstraints: const BoxConstraints(
                minWidth: 44,
                minHeight: 44,
              ),
            ),
          ),
        ),
        const SizedBox(width: Tokens.s8),
        GestureDetector(
          onTap: () {
            HapticFeedback.selectionClick();
            onFilters();
          },
          child: Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: activeFilters > 0
                  ? theme.colorScheme.primary
                  : theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(Tokens.rMd),
              border: Border.all(color: theme.colorScheme.outlineVariant),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Icon(
                  Icons.tune,
                  size: 20,
                  color: activeFilters > 0
                      ? theme.colorScheme.onPrimary
                      : theme.colorScheme.onSurface,
                ),
                if (activeFilters > 0)
                  Positioned(
                    top: 10,
                    right: 10,
                    child: Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        color: Tokens.accent,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.caption, this.tight = false});

  final String title;
  final String? caption;

  /// True when a lens row sits directly above and already supplies the gap.
  final bool tight;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.fromLTRB(
        Tokens.gutter,
        tight ? Tokens.s16 : Tokens.s32,
        Tokens.gutter,
        Tokens.s16,
      ),
      // Title and caption stack rather than sharing a line. Side by side, a
      // 390pt phone truncates both of them into uselessness — and these are
      // the strings that tell the customer what they are looking at.
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: theme.textTheme.headlineSmall),
          if (caption != null) ...[
            const SizedBox(height: 2),
            Text(caption!, style: theme.textTheme.bodySmall),
          ],
        ],
      ),
    );
  }
}

/// The journey is explicit that this is a real state, not an error: nothing
/// near IT Park under ₱5,000 is a common outcome, and it should offer a way
/// forward rather than a dead end.
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
            onPressed: () => ref.read(filtersProvider.notifier).clear(),
            child: const Text('Clear filters'),
          ),
        ],
      ),
    );
  }
}

/// A header icon with an unread count.
class _HeaderAction extends StatelessWidget {
  const _HeaderAction({
    required this.icon,
    required this.unread,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final int unread;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      button: true,
      label: unread > 0 ? '$tooltip, $unread unread' : tooltip,
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: SizedBox(
          width: Tokens.tap,
          height: Tokens.tap,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: theme.colorScheme.surfaceContainerHighest,
                  border: Border.all(color: theme.colorScheme.outlineVariant),
                ),
                child: Icon(icon, size: 19),
              ),
              if (unread > 0)
                Positioned(
                  top: 1,
                  right: 1,
                  child: Container(
                    constraints: const BoxConstraints(minWidth: 17),
                    height: 17,
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Tokens.accent,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: theme.colorScheme.surface,
                        width: 2,
                      ),
                    ),
                    child: Text(
                      unread > 9 ? '9+' : '$unread',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        height: 1.1,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Popular · Nearby · Recommendation.
///
/// Three orderings of the same inventory, not three catalogues. Scrollable
/// because the labels are long enough to overflow a 375pt screen once the
/// user's text size goes up.
class _LensRow extends StatelessWidget {
  const _LensRow({required this.selected, required this.onSelected});

  final FeaturedLens selected;
  final ValueChanged<FeaturedLens> onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      height: 38,
      child: ListView(
        scrollDirection: Axis.horizontal,
        physics: Tokens.scroll,
        padding: EdgeInsets.zero,
        children: [
          for (final lens in FeaturedLens.values)
            Padding(
              padding: const EdgeInsets.only(right: Tokens.s8),
              child: GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  onSelected(lens);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 160),
                  curve: Curves.easeOut,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: lens == selected
                        ? theme.colorScheme.primary
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: lens == selected
                          ? theme.colorScheme.primary
                          : theme.colorScheme.outlineVariant,
                    ),
                  ),
                  child: Text(
                    lens.label,
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: lens == selected
                          ? theme.colorScheme.onPrimary
                          : theme.colorScheme.onSurface,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
