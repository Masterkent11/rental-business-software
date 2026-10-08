import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/listing_repository.dart';
import '../../fixtures/view_models.dart';
import '../location/location_controller.dart';
import 'search_criteria.dart';

enum MarketIntent { rent, buy }

enum BuyCategory {
  houseAndLot('House & Lot', propertyType: 'HOUSE'),
  condo('Condo', propertyType: 'CONDO'),
  townhouse('Townhouse', propertyType: 'TOWNHOUSE'),
  lot('Lot', propertyType: 'LOT'),
  commercial('Commercial', propertyType: 'COMMERCIAL'),
  preSelling('Pre-selling', saleStatus: 'PRE_SELLING');

  const BuyCategory(this.label, {this.propertyType, this.saleStatus});

  final String label;
  final String? propertyType;
  final String? saleStatus;
}

@immutable
class DiscoveryFilters {
  const DiscoveryFilters({
    this.query = '',
    this.intent = MarketIntent.rent,
    this.buyCategory,
    this.kind,
    this.type,
    this.maxCentavos,
    this.tourOnly = false,
  });

  final String query;
  final MarketIntent intent;
  final BuyCategory? buyCategory;
  final ListingKind? kind;
  final ResourceType? type;
  final int? maxCentavos;
  final bool tourOnly;

  bool get isBuy => intent == MarketIntent.buy;

  bool get isFiltered =>
      buyCategory != null ||
      kind != null ||
      type != null ||
      maxCentavos != null ||
      tourOnly;

  int get activeCount => [
    buyCategory != null,
    kind != null,
    type != null,
    maxCentavos != null,
    tourOnly,
  ].where((on) => on).length;

  DiscoveryFilters copyWith({
    String? query,
    MarketIntent? intent,
    BuyCategory? buyCategory,
    bool clearBuyCategory = false,
    ListingKind? kind,
    ResourceType? type,
    int? maxCentavos,
    bool? tourOnly,
    bool clearKind = false,
    bool clearType = false,
    bool clearMax = false,
  }) {
    return DiscoveryFilters(
      query: query ?? this.query,
      intent: intent ?? this.intent,
      buyCategory: clearBuyCategory ? null : (buyCategory ?? this.buyCategory),
      kind: clearKind ? null : (kind ?? this.kind),
      type: clearType ? null : (type ?? this.type),
      maxCentavos: clearMax ? null : (maxCentavos ?? this.maxCentavos),
      tourOnly: tourOnly ?? this.tourOnly,
    );
  }
}

final filtersProvider = NotifierProvider<FiltersController, DiscoveryFilters>(
  FiltersController.new,
);

class FiltersController extends Notifier<DiscoveryFilters> {
  @override
  DiscoveryFilters build() => const DiscoveryFilters();

  void setQuery(String value) => state = state.copyWith(query: value);

  void setIntent(MarketIntent intent) {
    if (intent == state.intent) return;
    state = DiscoveryFilters(query: state.query, intent: intent);
  }

  void setBuyCategory(BuyCategory? category) =>
      state = state.copyWith(buyCategory: category, clearBuyCategory: category == null);

  void setKind(ListingKind? kind) =>
      state = state.copyWith(kind: kind, clearKind: kind == null);

  void setType(ResourceType? type) =>
      state = state.copyWith(type: type, clearType: type == null);

  void setMax(int? centavos) =>
      state = state.copyWith(maxCentavos: centavos, clearMax: centavos == null);

  void setTourOnly(bool value) => state = state.copyWith(tourOnly: value);


  void clear() => state = DiscoveryFilters(query: state.query, intent: state.intent);
}

class DiscoveryFeedState {
  const DiscoveryFeedState({
    required this.items,
    required this.total,
    required this.hasMore,
    this.loadingMore = false,
    this.loadMoreError,
  });

  final List<ListingCardView> items;
  final int total;
  final bool hasMore;
  final bool loadingMore;
  final Object? loadMoreError;

  DiscoveryFeedState copyWith({
    List<ListingCardView>? items,
    int? total,
    bool? hasMore,
    bool? loadingMore,
    Object? loadMoreError,
    bool clearError = false,
  }) =>
      DiscoveryFeedState(
        items: items ?? this.items,
        total: total ?? this.total,
        hasMore: hasMore ?? this.hasMore,
        loadingMore: loadingMore ?? this.loadingMore,
        loadMoreError: clearError ? null : (loadMoreError ?? this.loadMoreError),
      );
}

class DiscoveryFeed extends AutoDisposeAsyncNotifier<DiscoveryFeedState> {
  @override
  Future<DiscoveryFeedState> build() async {
    final filters = ref.watch(filtersProvider);
    final place = ref.watch(locationProvider.select((s) => s.place));
    final page = await ref.watch(listingRepositoryProvider).search(filters, place: place);
    return DiscoveryFeedState(items: page.items, total: page.total, hasMore: page.hasMore);
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.loadingMore) return;
    state = AsyncData(current.copyWith(loadingMore: true, clearError: true));
    try {
      final page = await ref
          .read(listingRepositoryProvider)
          .search(ref.read(filtersProvider), place: ref.read(locationProvider).place, offset: current.items.length);
      final seen = current.items.map((l) => l.id).toSet();
      state = AsyncData(
        current.copyWith(
          items: [...current.items, ...page.items.where((l) => !seen.contains(l.id))],
          total: page.total,
          hasMore: page.hasMore,
          loadingMore: false,
        ),
      );
    } catch (error) {
      state = AsyncData(current.copyWith(loadingMore: false, loadMoreError: error));
    }
  }
}

final resultsProvider =
    AsyncNotifierProvider.autoDispose<DiscoveryFeed, DiscoveryFeedState>(DiscoveryFeed.new);

final nearbyProvider = FutureProvider.autoDispose<List<ListingCardView>>((ref) async {
  final place = ref.watch(locationProvider.select((s) => s.place));
  if (place is! NearMePlace) return const [];
  final intent = ref.watch(filtersProvider.select((f) => f.intent));
  final page = await ref.watch(listingRepositoryProvider).search(
        DiscoveryFilters(intent: intent),
        place: place,
        limit: 10,
      );
  return page.items;
});

final featuredLensProvider = StateProvider<FeaturedLens>(
  (ref) => FeaturedLens.popular,
);

final searchCriteriaProvider =
    NotifierProvider<SearchCriteriaController, SearchCriteria>(
      SearchCriteriaController.new,
    );

class SearchCriteriaController extends Notifier<SearchCriteria> {
  @override
  SearchCriteria build() => const SearchCriteria();

  void setDestination(String value) =>
      state = state.copyWith(destination: value);

  void setMode(SearchMode mode) => state = state.withMode(mode);

  void setPeriod(SearchPeriod period) => state = state.copyWith(period: period);

  void setOccupancy(Occupancy occupancy) =>
      state = state.copyWith(occupancy: occupancy);

  void clearPeriod() => state = state.copyWith(
    period: state.spec.usesNightRange ? const NightRange() : const TermFrom(),
  );

  void apply() {
    final spec = state.spec;
    ref.read(filtersProvider.notifier)
      ..setQuery(state.destination)
      ..setKind(spec.listingKind)
      ..setType(spec.resourceType);
  }
}
