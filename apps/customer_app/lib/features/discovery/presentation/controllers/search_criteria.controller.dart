import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../listings/domain/value_objects/listing_search_filters.value_object.dart';

/// Mutable state for search criteria in the Discovery screen.
class SearchCriteriaNotifier extends Notifier<ListingSearchFilters> {
  @override
  ListingSearchFilters build() => const ListingSearchFilters();

  void setKind(ListingKind? kind) {
    state = state.copyWith(kind: kind);
  }

  void toggleResourceType(ResourceType type) {
    final next = Set<ResourceType>.from(state.resourceTypes);
    if (next.contains(type)) {
      next.remove(type);
    } else {
      next.add(type);
    }
    state = state.copyWith(resourceTypes: next);
  }

  void setHasTourOnly(bool hasTour) {
    state = state.copyWith(hasTourOnly: hasTour);
  }

  void setAvailableOnly(bool availableOnly) {
    state = state.copyWith(availableOnly: availableOnly);
  }

  void reset() {
    state = const ListingSearchFilters();
  }
}

final searchCriteriaProvider =
    NotifierProvider<SearchCriteriaNotifier, ListingSearchFilters>(
  SearchCriteriaNotifier.new,
);
