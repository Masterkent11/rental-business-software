import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../fixtures/sample_data.dart';
import '../../fixtures/view_models.dart';

/// Discovery filter state.
///
/// Everything here is a **presentation** filter over fixture data. None of it
/// is an availability query, and none of it may become one: occupancy has
/// exactly one source of truth and it is not in this app.
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

  /// Count shown on the filter button, so the customer can see they have
  /// narrowed things without opening the sheet.
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

final filtersProvider =
    NotifierProvider<FiltersController, DiscoveryFilters>(
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

/// The filtered result list.
final resultsProvider = Provider<List<ListingCardView>>((ref) {
  final f = ref.watch(filtersProvider);
  final q = f.query.trim().toLowerCase();

  return SampleData.listings.where((listing) {
    if (f.kind != null && listing.kind != f.kind) return false;
    if (f.type != null && listing.resourceType != f.type) return false;
    if (f.tourOnly && !listing.hasTour) return false;
    if (f.availableOnly && !listing.isAvailable) return false;
    if (f.maxCentavos != null && listing.priceCentavos > f.maxCentavos!) {
      return false;
    }
    if (q.isEmpty) return true;
    return listing.title.toLowerCase().contains(q) ||
        listing.propertyName.toLowerCase().contains(q) ||
        listing.areaLabel.toLowerCase().contains(q) ||
        listing.cityLabel.toLowerCase().contains(q);
  }).toList();
});

/// Which ordering the featured row is showing.
///
/// Presentation only. The labels promise things a client cannot honestly
/// compute — "popular" is view counts and tour completions, "nearby" is the
/// customer's location — so the real lens is applied server-side and this holds
/// the selection.
final featuredLensProvider = StateProvider<FeaturedLens>(
  (ref) => FeaturedLens.popular,
);
