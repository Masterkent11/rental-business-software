import 'package:flutter/material.dart';

import '../../../design/controls.dart';
import '../domain/explore_query.dart';
import '../domain/listing_category.dart';
import 'widgets/buy_filters_sheet.dart';
import 'widgets/listing_search_scaffold.dart';

class BuySearchScreen extends StatelessWidget {
  const BuySearchScreen({required this.seed, this.focusSearch = false, super.key});

  final ExploreQuery seed;
  final bool focusSearch;

  static String titleFor(ExploreQuery query) {
    final category = query.category;
    return category == null ? 'Properties for sale' : '${category.labelFor(MarketIntent.buy)} for sale';
  }

  @override
  Widget build(BuildContext context) {
    return ListingSearchScaffold(
      seed: seed,
      titleFor: titleFor,
      searchHint: 'Search area, landmark or property',
      singularNoun: 'property',
      pluralNoun: 'properties',
      focusSearch: focusSearch,
      onOpenFilters: (context) => showBuyFiltersSheet(context, seed),
      notice: const AppInlineNotice(
        icon: Icons.lock_outline,
        message: 'Prices are shared privately by the agent or owner when you inquire.',
      ),
    );
  }
}
