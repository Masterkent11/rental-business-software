import '../features/explore/domain/calendar_day.dart';
import '../features/explore/domain/explore_query.dart';
import '../features/explore/domain/listing_category.dart';
import '../features/location/location_controller.dart';

export '../features/explore/domain/calendar_day.dart' show isoDay;

const int kListingPageSize = 20;
const int kNearbyRadiusKm = 25;

Map<String, String?> placeParameters(SearchPlace place) => switch (place) {
      NearMePlace(:final position) => {
          'lat': position.latitude.toStringAsFixed(3),
          'lng': position.longitude.toStringAsFixed(3),
        },
      AreaPlace(:final cityLabel) => {'city': cityLabel},
      AnywherePlace() => const {},
    };

Map<String, String?> listingSearchParameters(
  ExploreQuery query, {
  SearchPlace place = const AnywherePlace(),
  int offset = 0,
  int limit = kListingPageSize,
}) {
  final text = query.text.trim();
  final parameters = <String, String?>{
    'intent': query.intent.apiValue,
    'q': text.isEmpty ? null : text,
    'propertyType': query.category?.apiValue,
    'area': query.area,
    'limit': '$limit',
    'offset': '$offset',
  };

  for (final filter in query.quickFilters) {
    switch (filter) {
      case QuickFilter.furnished:
        parameters['furnished'] = 'true';
      case QuickFilter.petFriendly:
        if (!query.isBuy) parameters['petsAllowed'] = 'true';
      case QuickFilter.virtualTour:
        parameters['hasTour'] = 'true';
      case QuickFilter.pool:
        parameters['amenity'] = 'pool';
      case QuickFilter.preSelling:
        if (query.isBuy) parameters['saleStatus'] = 'PRE_SELLING';
    }
  }

  if (query.isBuy) {
    parameters['bedrooms'] = query.buy.minBedrooms?.toString();
    parameters['bathrooms'] = query.buy.minBathrooms?.toString();
    parameters['minFloorArea'] = query.buy.minFloorAreaSqm?.toString();
  } else {
    parameters['kind'] = switch (query.rentMode) {
      RentMode.shortStay => 'SHORT_TERM',
      RentMode.monthly => 'LONG_TERM',
      null => null,
    };
    parameters['maxPrice'] = query.maxPriceCentavos?.toString();
    switch (query.stay) {
      case ShortStaySearch(:final checkIn, :final checkOut, :final guests):
        parameters['kind'] = 'SHORT_TERM';
        parameters['checkIn'] = isoDay(checkIn);
        parameters['checkOut'] = isoDay(checkOut);
        parameters['guests'] = '$guests';
      case MonthlySearch(:final moveIn, :final occupants):
        parameters['kind'] = 'LONG_TERM';
        parameters['moveIn'] = isoDay(moveIn);
        parameters['guests'] = '$occupants';
      case null:
        break;
    }
  }

  parameters.addAll(placeParameters(place));
  final hasCoordinates = place is NearMePlace;
  if (hasCoordinates) parameters['radiusKm'] = '$kNearbyRadiusKm';
  parameters['sort'] = switch (query.sort) {
    ExploreSort.newest => 'NEWEST',
    ExploreSort.nearest when hasCoordinates => 'DISTANCE',
    ExploreSort.priceLowToHigh when !query.isBuy => 'PRICE_ASC',
    ExploreSort.priceHighToLow when !query.isBuy => 'PRICE_DESC',
    _ => hasCoordinates ? 'DISTANCE' : null,
  };

  parameters.removeWhere((_, value) => value == null);
  return parameters;
}

Map<String, String?> recommendationParameters({
  required MarketIntent intent,
  required SearchPlace place,
  ListingCategory? category,
  int limit = 10,
}) {
  final parameters = <String, String?>{
    'intent': intent.apiValue,
    'propertyType': category?.apiValue,
    'limit': '$limit',
    ...placeParameters(place),
  };
  parameters.removeWhere((_, value) => value == null);
  return parameters;
}
