import 'listing_category.dart';

enum RentMode {
  shortStay('Short stay'),
  monthly('Monthly rental');

  const RentMode(this.label);

  final String label;
}

extension ListingCategoryStays on ListingCategory {
  List<RentMode> get rentModes => this == ListingCategory.boardingHouse ? const [RentMode.monthly] : RentMode.values;
}

enum QuickFilter {
  furnished('Furnished', {MarketIntent.rent, MarketIntent.buy}),
  petFriendly('Pet-friendly', {MarketIntent.rent}),
  virtualTour('360° tour', {MarketIntent.rent, MarketIntent.buy}),
  pool('With pool', {MarketIntent.rent, MarketIntent.buy}),
  preSelling('Pre-selling', {MarketIntent.buy});

  const QuickFilter(this.label, this.intents);

  final String label;
  final Set<MarketIntent> intents;

  static List<QuickFilter> forIntent(MarketIntent intent) =>
      values.where((filter) => filter.intents.contains(intent)).toList(growable: false);
}

enum ExploreSort {
  recommended('Recommended'),
  newest('Newest'),
  nearest('Nearest'),
  priceLowToHigh('Price: low to high'),
  priceHighToLow('Price: high to low');

  const ExploreSort(this.label);

  final String label;

  bool availableFor(MarketIntent intent, {required bool hasCoordinates}) => switch (this) {
        ExploreSort.priceLowToHigh || ExploreSort.priceHighToLow => intent == MarketIntent.rent,
        ExploreSort.nearest => hasCoordinates,
        _ => true,
      };
}

sealed class StaySearch {
  const StaySearch();
}

final class ShortStaySearch extends StaySearch {
  const ShortStaySearch({required this.checkIn, required this.checkOut, required this.guests});

  final DateTime checkIn;
  final DateTime checkOut;
  final int guests;

  int get nights => checkOut.difference(checkIn).inDays;

  @override
  bool operator ==(Object other) =>
      other is ShortStaySearch && other.checkIn == checkIn && other.checkOut == checkOut && other.guests == guests;

  @override
  int get hashCode => Object.hash(checkIn, checkOut, guests);
}

final class MonthlySearch extends StaySearch {
  const MonthlySearch({required this.moveIn, required this.occupants});

  final DateTime moveIn;
  final int occupants;

  @override
  bool operator ==(Object other) => other is MonthlySearch && other.moveIn == moveIn && other.occupants == occupants;

  @override
  int get hashCode => Object.hash(moveIn, occupants);
}

class BuyRefinement {
  const BuyRefinement({this.minBedrooms, this.minBathrooms, this.minFloorAreaSqm});

  final int? minBedrooms;
  final int? minBathrooms;
  final int? minFloorAreaSqm;

  bool get isActive => minBedrooms != null || minBathrooms != null || minFloorAreaSqm != null;

  int get activeCount => [minBedrooms, minBathrooms, minFloorAreaSqm].where((v) => v != null).length;

  @override
  bool operator ==(Object other) =>
      other is BuyRefinement &&
      other.minBedrooms == minBedrooms &&
      other.minBathrooms == minBathrooms &&
      other.minFloorAreaSqm == minFloorAreaSqm;

  @override
  int get hashCode => Object.hash(minBedrooms, minBathrooms, minFloorAreaSqm);
}

class ExploreQuery {
  const ExploreQuery({
    this.intent = MarketIntent.rent,
    this.category,
    this.text = '',
    this.area,
    this.quickFilters = const {},
    this.rentMode,
    this.stay,
    this.buy = const BuyRefinement(),
    this.maxPriceCentavos,
    this.sort = ExploreSort.recommended,
  });

  final MarketIntent intent;
  final ListingCategory? category;
  final String text;
  final String? area;
  final Set<QuickFilter> quickFilters;
  final RentMode? rentMode;
  final StaySearch? stay;
  final BuyRefinement buy;
  final int? maxPriceCentavos;
  final ExploreSort sort;

  bool get isBuy => intent == MarketIntent.buy;

  bool get hasRefinements =>
      text.trim().isNotEmpty ||
      area != null ||
      quickFilters.isNotEmpty ||
      stay != null ||
      rentMode != null ||
      buy.isActive ||
      maxPriceCentavos != null;

  int get filterCount =>
      quickFilters.length +
      (isBuy ? buy.activeCount : (maxPriceCentavos == null ? 0 : 1) + (rentMode == null && stay == null ? 0 : 1));

  ExploreQuery copyWith({
    MarketIntent? intent,
    ListingCategory? category,
    bool clearCategory = false,
    String? text,
    String? area,
    bool clearArea = false,
    Set<QuickFilter>? quickFilters,
    RentMode? rentMode,
    bool clearRentMode = false,
    StaySearch? stay,
    bool clearStay = false,
    BuyRefinement? buy,
    int? maxPriceCentavos,
    bool clearMaxPrice = false,
    ExploreSort? sort,
  }) {
    return ExploreQuery(
      intent: intent ?? this.intent,
      category: clearCategory ? null : (category ?? this.category),
      text: text ?? this.text,
      area: clearArea ? null : (area ?? this.area),
      quickFilters: quickFilters ?? this.quickFilters,
      rentMode: clearRentMode ? null : (rentMode ?? this.rentMode),
      stay: clearStay ? null : (stay ?? this.stay),
      buy: buy ?? this.buy,
      maxPriceCentavos: clearMaxPrice ? null : (maxPriceCentavos ?? this.maxPriceCentavos),
      sort: sort ?? this.sort,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is ExploreQuery &&
      other.intent == intent &&
      other.category == category &&
      other.text == text &&
      other.area == area &&
      other.quickFilters.length == quickFilters.length &&
      other.quickFilters.containsAll(quickFilters) &&
      other.rentMode == rentMode &&
      other.stay == stay &&
      other.buy == buy &&
      other.maxPriceCentavos == maxPriceCentavos &&
      other.sort == sort;

  @override
  int get hashCode => Object.hash(
        intent,
        category,
        text,
        area,
        Object.hashAllUnordered(quickFilters),
        rentMode,
        stay,
        buy,
        maxPriceCentavos,
        sort,
      );
}
