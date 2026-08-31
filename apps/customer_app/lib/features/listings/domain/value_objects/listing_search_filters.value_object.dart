import 'listing_kind.value_object.dart';
import 'resource_type.value_object.dart';

export 'listing_kind.value_object.dart';
export 'resource_type.value_object.dart';

/// Value object representing search criteria for listings.
class ListingSearchFilters {
  const ListingSearchFilters({
    this.query = '',
    this.kind,
    this.resourceTypes = const {},
    this.minPriceCentavos,
    this.maxPriceCentavos,
    this.hasTourOnly = false,
    this.availableOnly = true,
    this.limit = 50,
    this.offset = 0,
  });

  final String query;
  final ListingKind? kind;
  final Set<ResourceType> resourceTypes;
  final int? minPriceCentavos;
  final int? maxPriceCentavos;
  final bool hasTourOnly;
  final bool availableOnly;
  final int limit;
  final int offset;

  ResourceType? get resourceType =>
      resourceTypes.isNotEmpty ? resourceTypes.first : null;
  bool get hasTour => hasTourOnly;

  ListingSearchFilters copyWith({
    String? query,
    ListingKind? kind,
    Set<ResourceType>? resourceTypes,
    int? minPriceCentavos,
    int? maxPriceCentavos,
    bool? hasTourOnly,
    bool? availableOnly,
    int? limit,
    int? offset,
  }) {
    return ListingSearchFilters(
      query: query ?? this.query,
      kind: kind ?? this.kind,
      resourceTypes: resourceTypes ?? this.resourceTypes,
      minPriceCentavos: minPriceCentavos ?? this.minPriceCentavos,
      maxPriceCentavos: maxPriceCentavos ?? this.maxPriceCentavos,
      hasTourOnly: hasTourOnly ?? this.hasTourOnly,
      availableOnly: availableOnly ?? this.availableOnly,
      limit: limit ?? this.limit,
      offset: offset ?? this.offset,
    );
  }
}
