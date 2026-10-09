import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../app/router.dart';
import '../../../../data/api_client.dart';
import '../../../../design/components.dart';
import '../../../../design/controls.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import '../../../discovery/widgets/listing_card.dart';
import '../../application/explore_controller.dart';
import '../../application/explore_results.dart';
import '../../domain/explore_query.dart';

class ListingResultsSliver extends ConsumerWidget {
  const ListingResultsSliver({required this.seed, required this.pluralNoun, super.key});

  final ExploreQuery seed;
  final String pluralNoun;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final results = ref.watch(exploreResultsProvider(seed));
    final state = results.valueOrNull;
    if (results.hasError && state == null) {
      final error = results.error;
      return SliverToBoxAdapter(
        child: ErrorState(
          title: 'Couldn’t load $pluralNoun',
          message: error is ApiException ? error.message : 'Check your connection and try again.',
          onRetry: () => ref.invalidate(exploreResultsProvider(seed)),
        ),
      );
    }
    if (state == null) return const SliverToBoxAdapter(child: _ResultsSkeleton());
    if (state.items.isEmpty) {
      final query = ref.watch(exploreQueryProvider(seed));
      final canClear = query.filterCount > 0 || query.text.isNotEmpty || query.area != null;
      return SliverToBoxAdapter(
        child: EmptyState(
          icon: Icons.search_off_rounded,
          title: 'No $pluralNoun match yet',
          message: 'Try another area, a different category or fewer filters.',
          actionLabel: canClear ? 'Clear filters' : null,
          onAction: canClear
              ? () {
                  ref.read(exploreQueryProvider(seed).notifier)
                    ..clearFilters()
                    ..setText('')
                    ..setArea(null);
                }
              : null,
        ),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s40),
      sliver: SliverList.separated(
        itemCount: state.items.length + 1,
        separatorBuilder: (_, __) => const SizedBox(height: Tokens.s16),
        itemBuilder: (context, i) {
          if (i == state.items.length) {
            return _Footer(
              state: state,
              refreshing: results.isLoading,
              onRetry: () => ref.read(exploreResultsProvider(seed).notifier).loadMore(),
            );
          }
          final listing = state.items[i];
          return ListingCard(listing: listing, onTap: () => context.push(Routes.listing(listing.id)));
        },
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({required this.state, required this.refreshing, required this.onRetry});

  final ExploreResultsState state;
  final bool refreshing;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    if (state.loadingMore || refreshing) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: Tokens.s16),
        child:
            Center(child: SizedBox.square(dimension: Tokens.spinner, child: CircularProgressIndicator(strokeWidth: 2))),
      );
    }
    if (state.loadMoreError != null) {
      return Center(
        child: AppCompactButton(label: 'Couldn’t load more · Retry', tone: AppCompactTone.outline, onPressed: onRetry),
      );
    }
    if (state.hasMore) {
      return Center(child: AppCompactButton(label: 'Show more', tone: AppCompactTone.outline, onPressed: onRetry));
    }
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: Tokens.s8),
      child: Text('That’s everything for this search', textAlign: TextAlign.center, style: AppText.caption),
    );
  }
}

class _ResultsSkeleton extends StatelessWidget {
  const _ResultsSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SkeletonBox(height: Tokens.skeletonCardHeight, radius: Tokens.rCard),
          SizedBox(height: Tokens.s12),
          SkeletonBox(width: Tokens.skeletonLineLong),
          SizedBox(height: Tokens.s8),
          SkeletonBox(width: Tokens.skeletonLineShort),
          SizedBox(height: Tokens.s24),
          SkeletonBox(height: Tokens.skeletonCardHeight, radius: Tokens.rCard),
        ],
      ),
    );
  }
}
