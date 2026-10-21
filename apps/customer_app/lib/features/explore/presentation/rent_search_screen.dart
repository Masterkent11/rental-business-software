import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../application/explore_controller.dart';
import '../domain/explore_query.dart';
import 'widgets/listing_search_scaffold.dart';
import 'widgets/search_summary_chip.dart';
import 'widgets/rent_filters_sheet.dart';

class RentSearchScreen extends StatelessWidget {
  const RentSearchScreen({required this.seed, this.focusSearch = false, super.key});

  final ExploreQuery seed;
  final bool focusSearch;

  static String titleFor(ExploreQuery query) {
    final noun = query.category?.plural ?? 'Places';
    return switch (query.rentMode) {
      RentMode.shortStay => '$noun for short stays',
      RentMode.monthly => '$noun for monthly rent',
      null => '$noun for rent',
    };
  }

  @override
  Widget build(BuildContext context) {
    return ListingSearchScaffold(
      seed: seed,
      titleFor: titleFor,
      searchHint: 'Search area, landmark or property',
      singularNoun: 'place',
      pluralNoun: 'places',
      focusSearch: focusSearch,
      onOpenFilters: (context) => showRentFiltersSheet(context, seed),
      summary: _StaySummary(seed: seed),
    );
  }
}

class _StaySummary extends ConsumerWidget {
  const _StaySummary({required this.seed});

  final ExploreQuery seed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = ref.watch(exploreQueryProvider(seed));
    final day = DateFormat('MMM d');
    final label = switch (query.stay) {
      ShortStaySearch(:final checkIn, :final checkOut, :final guests) =>
        '${day.format(checkIn)}  ${day.format(checkOut)} · $guests ${guests == 1 ? 'guest' : 'guests'}',
      MonthlySearch(:final moveIn, :final occupants) =>
        'Move in ${day.format(moveIn)} · $occupants ${occupants == 1 ? 'occupant' : 'occupants'}',
      null => null,
    };
    if (label == null) return const SizedBox.shrink();
    return Align(
      alignment: Alignment.centerLeft,
      child: SearchSummaryChip(
        icon: query.stay is ShortStaySearch ? Icons.date_range_outlined : Icons.event_outlined,
        label: label,
        onTap: () => showRentFiltersSheet(context, seed),
        onClear: ref.read(exploreQueryProvider(seed).notifier).clearStay,
      ),
    );
  }
}
