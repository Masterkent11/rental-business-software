import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../design/tokens.dart';
import '../../application/explore_results.dart';
import '../../domain/explore_query.dart';
import 'listing_results_sliver.dart';

class ListingResultsScrollView extends ConsumerStatefulWidget {
  const ListingResultsScrollView({
    required this.seed,
    required this.pluralNoun,
    this.leading = const [],
    super.key,
  });

  final ExploreQuery seed;
  final String pluralNoun;
  final List<Widget> leading;

  @override
  ConsumerState<ListingResultsScrollView> createState() => _ListingResultsScrollViewState();
}

class _ListingResultsScrollViewState extends ConsumerState<ListingResultsScrollView> {
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_maybeLoadMore);
  }

  @override
  void dispose() {
    _scroll
      ..removeListener(_maybeLoadMore)
      ..dispose();
    super.dispose();
  }

  void _maybeLoadMore() {
    if (!mounted || !_scroll.hasClients) return;
    final position = _scroll.position;
    if (position.pixels >= position.maxScrollExtent - Tokens.paginationPrefetchExtent) {
      ref.read(exploreResultsProvider(widget.seed).notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: Tokens.primaryNavy,
      onRefresh: () => ref.read(exploreResultsProvider(widget.seed).notifier).refresh(),
      child: CustomScrollView(
        controller: _scroll,
        physics: Tokens.scroll,
        slivers: [
          ...widget.leading,
          ListingResultsSliver(seed: widget.seed, pluralNoun: widget.pluralNoun),
        ],
      ),
    );
  }
}
