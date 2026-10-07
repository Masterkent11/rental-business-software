import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/listing_repository.dart';
import '../../fixtures/view_models.dart';
import 'search_criteria.dart';

@immutable
class DiscoveryFilters {
  const DiscoveryFilters({
    this.query = '',
    this.kind,
    this.type,
    this.maxCentavos,
    this.tourOnly = false,
    this.availableOnly = false,
  });

  final String query;
  final ListingKind? kind;
  final ResourceType? type;
  final int? maxCentavos;
  final bool tourOnly;
  final bool availableOnly;

  bool get isFiltered =>
      kind != null ||
      type != null ||
      maxCentavos != null ||
      tourOnly ||
      availableOnly;

  int get activeCount => [
    kind != null,
    type != null,
    maxCentavos != null,
    tourOnly,
    availableOnly,
  ].where((on) => on).length;

  DiscoveryFilters copyWith({
    String? query,
    ListingKind? kind,
    ResourceType? type,
    int? maxCentavos,
    bool? tourOnly,
    bool? availableOnly,
    bool clearKind = false,
    bool clearType = false,
    bool clearMax = false,
  }) {
    return DiscoveryFilters(
      query: query ?? this.query,
      kind: clearKind ? null : (kind ?? this.kind),
      type: clearType ? null : (type ?? this.type),
      maxCentavos: clearMax ? null : (maxCentavos ?? this.maxCentavos),
      tourOnly: tourOnly ?? this.tourOnly,
      availableOnly: availableOnly ?? this.availableOnly,
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

  void setKind(ListingKind? kind) =>
      state = state.copyWith(kind: kind, clearKind: kind == null);

  void setType(ResourceType? type) =>
      state = state.copyWith(type: type, clearType: type == null);

  void setMax(int? centavos) =>
      state = state.copyWith(maxCentavos: centavos, clearMax: centavos == null);

  void setTourOnly(bool value) => state = state.copyWith(tourOnly: value);

  void setAvailableOnly(bool value) =>
      state = state.copyWith(availableOnly: value);

  void clear() => state = DiscoveryFilters(query: state.query);
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
    final page = await ref.watch(listingRepositoryProvider).search(filters);
    return DiscoveryFeedState(items: page.items, total: page.total, hasMore: page.hasMore);
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.loadingMore) return;
    state = AsyncData(current.copyWith(loadingMore: true, clearError: true));
    try {
      final page = await ref
          .read(listingRepositoryProvider)
          .search(ref.read(filtersProvider), offset: current.items.length);
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
