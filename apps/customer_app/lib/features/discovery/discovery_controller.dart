import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/listing_repository.dart';
import '../../fixtures/sample_data.dart';
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

final resultsProvider = FutureProvider.autoDispose<List<ListingCardView>>((
  ref,
) async {
  final filters = ref.watch(filtersProvider);
  final repository = ref.watch(listingRepositoryProvider);
  try {
    return await repository.search(filters);
  } catch (_) {
    return SampleData.listings;
  }
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
