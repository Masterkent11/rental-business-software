import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../design/tokens.dart';
import '../domain/explore_query.dart';
import 'stay_search_screen.dart';
import 'widgets/listing_results_scroll_view.dart';
import 'widgets/results_count_bar.dart';
import 'widgets/stay_header.dart';
import 'widgets/stay_summary_bar.dart';

class StayResultsScreen extends StatelessWidget {
  const StayResultsScreen({required this.query, super.key});

  final ExploreQuery query;

  @override
  Widget build(BuildContext context) {
    final category = query.category;
    final plural = category?.plural.toLowerCase() ?? 'places';
    final singular = category?.label.toLowerCase() ?? 'place';
    return Scaffold(
      backgroundColor: Tokens.canvas,
      body: ListingResultsScrollView(
        seed: query,
        pluralNoun: plural,
        leading: [
          SliverSafeArea(
            bottom: false,
            sliver: SliverToBoxAdapter(child: StayHeader(title: StaySearchScreen.titleFor(category))),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s4),
            sliver: SliverToBoxAdapter(
              child: StaySummaryBar(query: query, onEdit: () => context.pop()),
            ),
          ),
          SliverToBoxAdapter(child: ResultsCountBar(seed: query, singularNoun: singular, pluralNoun: plural)),
        ],
      ),
    );
  }
}
