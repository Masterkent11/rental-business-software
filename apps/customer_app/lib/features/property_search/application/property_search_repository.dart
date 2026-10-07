import '../../../fixtures/view_models.dart';
import '../domain/property_search_criteria.dart';

enum PropertySortOrder {
  recommended('Recommended', null),
  priceLowToHigh('Price: low to high', 'PRICE_ASC'),
  priceHighToLow('Price: high to low', 'PRICE_DESC');

  const PropertySortOrder(this.label, this.apiValue);
  final String label;
  final String? apiValue;
}

class PropertySearchPage {
  const PropertySearchPage({
    required this.items,
    required this.total,
    required this.hasMore,
  });

  final List<ListingCardView> items;
  final int total;
  final bool hasMore;
}

class PropertyRefinements {
  const PropertyRefinements({
    this.sort = PropertySortOrder.recommended,
    this.keyword = '',
    this.maxPriceCentavos,
    this.minBedrooms,
  });

  final PropertySortOrder sort;
  final String keyword;
  final int? maxPriceCentavos;
  final int? minBedrooms;

  bool get isActive =>
      sort != PropertySortOrder.recommended ||
      keyword.trim().isNotEmpty ||
      maxPriceCentavos != null ||
      minBedrooms != null;

  PropertyRefinements copyWith({
    PropertySortOrder? sort,
    String? keyword,
    int? maxPriceCentavos,
    int? minBedrooms,
    bool clearMaxPrice = false,
    bool clearMinBedrooms = false,
  }) =>
      PropertyRefinements(
        sort: sort ?? this.sort,
        keyword: keyword ?? this.keyword,
        maxPriceCentavos: clearMaxPrice ? null : (maxPriceCentavos ?? this.maxPriceCentavos),
        minBedrooms: clearMinBedrooms ? null : (minBedrooms ?? this.minBedrooms),
      );

  @override
  bool operator ==(Object other) =>
      other is PropertyRefinements &&
      other.sort == sort &&
      other.keyword.trim() == keyword.trim() &&
      other.maxPriceCentavos == maxPriceCentavos &&
      other.minBedrooms == minBedrooms;

  @override
  int get hashCode => Object.hash(sort, keyword.trim(), maxPriceCentavos, minBedrooms);
}

abstract interface class PropertySearchRepository {
  Future<PropertySearchPage> searchProperties(
    PropertySearchCriteria criteria, {
    int offset = 0,
    PropertyRefinements refinements = const PropertyRefinements(),
  });
}
