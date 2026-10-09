import 'calendar_day.dart';
import 'explore_query.dart';
import 'listing_category.dart';

abstract final class ExploreQueryCodec {
  static Map<String, String> encode(ExploreQuery query) {
    final stay = query.stay;
    return {
      if (query.category != null) 'category': query.category!.name,
      if (query.rentMode != null) 'mode': query.rentMode!.name,
      if (query.text.trim().isNotEmpty) 'q': query.text.trim(),
      if (query.area != null) 'area': query.area!,
      if (query.quickFilters.isNotEmpty) 'filters': (query.quickFilters.map((f) => f.name).toList()..sort()).join(','),
      if (query.sort != ExploreSort.recommended) 'sort': query.sort.name,
      if (stay case ShortStaySearch(:final checkIn, :final checkOut, :final guests)) ...{
        'checkIn': isoDay(checkIn),
        'checkOut': isoDay(checkOut),
        'guests': '$guests',
      },
      if (stay case MonthlySearch(:final moveIn, :final occupants)) ...{
        'moveIn': isoDay(moveIn),
        'occupants': '$occupants',
      },
    };
  }

  static ExploreQuery decode(Map<String, String> parameters, MarketIntent intent) {
    final category = ListingCategory.tryParse(parameters['category']);
    final rent = intent == MarketIntent.rent;
    final filterNames = (parameters['filters'] ?? parameters['filter'] ?? '').split(',').toSet();
    final stay = rent ? _stay(parameters) : null;
    return ExploreQuery(
      intent: intent,
      category: category != null && category.supports(intent) ? category : null,
      text: parameters['q'] ?? '',
      area: parameters['area'],
      rentMode: rent ? (_modeOf(stay) ?? _rentMode(parameters['mode'])) : null,
      stay: stay,
      quickFilters: QuickFilter.values
          .where((filter) => filterNames.contains(filter.name) && filter.intents.contains(intent))
          .toSet(),
      sort: ExploreSort.values.where((sort) => sort.name == parameters['sort']).firstOrNull ?? ExploreSort.recommended,
    );
  }

  static RentMode? _modeOf(StaySearch? stay) => switch (stay) {
        ShortStaySearch() => RentMode.shortStay,
        MonthlySearch() => RentMode.monthly,
        null => null,
      };

  static RentMode? _rentMode(String? value) => RentMode.values.where((mode) => mode.name == value).firstOrNull;

  static StaySearch? _stay(Map<String, String> parameters) {
    final checkIn = parseIsoDay(parameters['checkIn']);
    final checkOut = parseIsoDay(parameters['checkOut']);
    final guests = int.tryParse(parameters['guests'] ?? '');
    if (checkIn != null && checkOut != null && guests != null) {
      return ShortStaySearch(checkIn: checkIn, checkOut: checkOut, guests: guests);
    }
    final moveIn = parseIsoDay(parameters['moveIn']);
    final occupants = int.tryParse(parameters['occupants'] ?? '');
    if (moveIn != null && occupants != null) return MonthlySearch(moveIn: moveIn, occupants: occupants);
    return null;
  }
}
