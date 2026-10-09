import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/discovery_repository.dart';
import '../../../data/listing_repository.dart';
import '../../../fixtures/view_models.dart';
import '../../location/location_controller.dart';
import '../domain/explore_query.dart';
import '../domain/listing_category.dart';

typedef RecommendationKey = ({MarketIntent intent, ListingCategory? category});

final recommendationsProvider = StreamProvider.autoDispose.family<Recommendations, RecommendationKey>((ref, key) {
  final place = ref.watch(locationProvider.select((s) => s.place));
  return ref.watch(discoveryRepositoryProvider).watchRecommendations(
        intent: key.intent,
        category: key.category,
        place: place,
      );
});

final popularAreasProvider = StreamProvider.autoDispose.family<List<PopularAreaView>, MarketIntent>((ref, intent) {
  final city = ref.watch(locationProvider.select((s) => s.cityContext));
  return ref.watch(discoveryRepositoryProvider).watchPopularAreas(intent: intent, city: city);
});

final tourListingsProvider = StreamProvider.autoDispose<List<ListingCardView>>((ref) {
  final place = ref.watch(locationProvider.select((s) => s.place));
  return ref
      .watch(listingRepositoryProvider)
      .watchSearch(const ExploreQuery(quickFilters: {QuickFilter.virtualTour}), place: place, limit: 8)
      .map((page) => page.items);
});
