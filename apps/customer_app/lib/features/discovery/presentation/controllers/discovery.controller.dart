import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/composition_root.dart';
import '../../../listings/domain/entities/listing.entity.dart';
import '../../../listings/domain/value_objects/listing_search_filters.value_object.dart';

export '../../../listings/domain/value_objects/listing_search_filters.value_object.dart';
export '../../domain/value_objects/featured_lens.value_object.dart';

class DiscoveryFilters {
  const DiscoveryFilters({
    this.query = '',
    this.kind,
    this.type,
    this.maxCentavos,
    this.tourOnly = false,
  });

  final String query;
  final ListingKind? kind;
  final ResourceType? type;
  final int? maxCentavos;
  final bool tourOnly;

  DiscoveryFilters copyWith({
    String? query,
    ListingKind? kind,
    bool clearKind = false,
    ResourceType? type,
    bool clearType = false,
    int? maxCentavos,
    bool clearMax = false,
    bool? tourOnly,
  }) {
    return DiscoveryFilters(
      query: query ?? this.query,
      kind: clearKind ? null : (kind ?? this.kind),
      type: clearType ? null : (type ?? this.type),
      maxCentavos: clearMax ? null : (maxCentavos ?? this.maxCentavos),
      tourOnly: tourOnly ?? this.tourOnly,
    );
  }

  ListingSearchFilters toSearchFilters() => ListingSearchFilters(
        query: query,
        kind: kind,
        resourceTypes: type != null ? {type!} : const {},
        maxPriceCentavos: maxCentavos,
        hasTourOnly: tourOnly,
      );
}

class FiltersController extends Notifier<DiscoveryFilters> {
  @override
  DiscoveryFilters build() => const DiscoveryFilters();

  void setQuery(String query) => state = state.copyWith(query: query);
  void setKind(ListingKind? kind) => state = state.copyWith(kind: kind, clearKind: kind == null);
  void setType(ResourceType? type) => state = state.copyWith(type: type, clearType: type == null);
  void setMaxCentavos(int? maxCentavos) => state = state.copyWith(maxCentavos: maxCentavos, clearMax: maxCentavos == null);
  void setTourOnly(bool tourOnly) => state = state.copyWith(tourOnly: tourOnly);
  void reset() => state = const DiscoveryFilters();
}

final filtersProvider = NotifierProvider<FiltersController, DiscoveryFilters>(
  FiltersController.new,
);

final searchCriteriaProvider = filtersProvider;
typedef SearchCriteriaController = FiltersController;

final featuredLensProvider = StateProvider<FeaturedLens>((ref) => FeaturedLens.popular);

final resultsProvider = FutureProvider<List<Listing>>((ref) async {
  final filters = ref.watch(filtersProvider);
  return ref.watch(listingRepositoryProvider).search(filters);
});

final discoveryListingsProvider = resultsProvider;
