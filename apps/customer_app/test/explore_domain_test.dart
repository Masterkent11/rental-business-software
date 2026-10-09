import 'package:customer_app/data/listing_query.dart';
import 'package:customer_app/features/discovery/home_shortcut.dart';
import 'package:customer_app/features/explore/domain/explore_mode.dart';
import 'package:customer_app/features/explore/domain/explore_query.dart';
import 'package:customer_app/features/explore/domain/listing_category.dart';
import 'package:customer_app/features/explore/domain/stay_validation.dart';
import 'package:customer_app/features/location/location_controller.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime(2026, 10, 9, 15);

  group('Categories', () {
    test('home shortcuts are Apartment, Condo, House, Room, Boarding House and Buy with no Explore or Short Stay', () {
      expect(HomeShortcut.values.map((s) => s.label), [
        'Apartment',
        'Condo',
        'House',
        'Room',
        'Boarding House',
        'Buy',
      ]);
      for (final shortcut in HomeShortcut.values) {
        expect(shortcut.icon, matches(RegExp(r'^assets/icons/categories/[a-z_]+\.svg$')));
      }
      expect(HomeShortcut.buy.intent, MarketIntent.buy);
    });

    test('boarding houses are monthly only and are not offered as short stays', () {
      expect(ListingCategory.boardingHouse.rentModes, [RentMode.monthly]);
      expect(ListingCategory.condo.rentModes, RentMode.values);
      expect(ExploreMode.shortStay.categories, isNot(contains(ListingCategory.boardingHouse)));
      expect(ExploreMode.monthly.categories, contains(ListingCategory.boardingHouse));
    });

    test('rent and buy have their own category lists', () {
      expect(ListingCategory.forIntent(MarketIntent.rent).take(4), [
        ListingCategory.apartment,
        ListingCategory.condo,
        ListingCategory.house,
        ListingCategory.room,
      ]);
      expect(ListingCategory.forIntent(MarketIntent.buy).first, ListingCategory.house);
      expect(ListingCategory.forIntent(MarketIntent.buy), isNot(contains(ListingCategory.room)));
      expect(ListingCategory.forIntent(MarketIntent.rent), isNot(contains(ListingCategory.lot)));
    });

    test('every category has a bundled photo header', () {
      for (final category in ListingCategory.values) {
        expect(category.image, startsWith('assets/images/categories/'));
      }
      expect(ListingCategory.exploreImage, 'assets/images/categories/explore.jpg');
    });

    test('house reads as House & Lot only when buying', () {
      expect(ListingCategory.house.labelFor(MarketIntent.rent), 'House');
      expect(ListingCategory.house.labelFor(MarketIntent.buy), 'House & Lot');
    });

    test('parses route and API spellings', () {
      expect(ListingCategory.tryParse('condo'), ListingCategory.condo);
      expect(ListingCategory.tryParse('BOARDING_HOUSE'), ListingCategory.boardingHouse);
      expect(ListingCategory.tryParse('boarding-house'), ListingCategory.boardingHouse);
      expect(ListingCategory.tryParse('castle'), isNull);
      expect(MarketIntent.tryParse('sale'), MarketIntent.buy);
      expect(MarketIntent.tryParse('RENT'), MarketIntent.rent);
    });

    test('buy-only categories default to Buy and rent-only to Rent', () {
      expect(ListingCategory.lot.defaultIntent, MarketIntent.buy);
      expect(ListingCategory.room.defaultIntent, MarketIntent.rent);
      expect(ListingCategory.forIntent(MarketIntent.buy), isNot(contains(ListingCategory.room)));
    });
  });

  group('Explore modes and filters', () {
    test('modes map to an intent and an optional stay type', () {
      expect(ExploreMode.buy.intent, MarketIntent.buy);
      expect(ExploreMode.buy.categories, ListingCategory.forIntent(MarketIntent.buy));
      expect(ExploreMode.shortStay.rentMode, RentMode.shortStay);
      expect(ExploreMode.monthly.rentMode, RentMode.monthly);
      expect(ExploreMode.tryParse('monthly'), ExploreMode.monthly);
      expect(ExploreMode.tryParse('nope'), ExploreMode.rent);
    });

    test('filter count reflects only the active refinements of that intent', () {
      expect(const ExploreQuery().filterCount, 0);
      expect(
        const ExploreQuery(rentMode: RentMode.monthly, maxPriceCentavos: 1, quickFilters: {QuickFilter.furnished})
            .filterCount,
        3,
      );
      expect(
        const ExploreQuery(intent: MarketIntent.buy, buy: BuyRefinement(minBedrooms: 2, minBathrooms: 1)).filterCount,
        2,
      );
    });

    test('quick filters are offered per intent', () {
      expect(QuickFilter.forIntent(MarketIntent.buy), isNot(contains(QuickFilter.petFriendly)));
      expect(QuickFilter.forIntent(MarketIntent.rent), isNot(contains(QuickFilter.preSelling)));
    });

    test('price sorting is never available for Buy', () {
      expect(ExploreSort.priceLowToHigh.availableFor(MarketIntent.buy, hasCoordinates: true), isFalse);
      expect(ExploreSort.nearest.availableFor(MarketIntent.rent, hasCoordinates: false), isFalse);
    });
  });

  group('Stay validation', () {
    test('short stay requires future dates in order and sane guests', () {
      final today = DateTime(2026, 10, 9);
      expect(
        StayValidation.shortStay(checkIn: today, checkOut: today.add(const Duration(days: 2)), guests: 2, now: now),
        isNull,
      );
      expect(StayValidation.shortStay(checkIn: null, checkOut: today, guests: 2, now: now), 'Choose a check-in date');
      expect(
        StayValidation.shortStay(
            checkIn: today.subtract(const Duration(days: 1)), checkOut: today, guests: 2, now: now),
        'Check-in can’t be in the past',
      );
      expect(
        StayValidation.shortStay(checkIn: today, checkOut: today, guests: 2, now: now),
        'Check-out must be after check-in',
      );
      expect(
        StayValidation.shortStay(
          checkIn: today,
          checkOut: today.add(const Duration(days: 1)),
          guests: OccupancyLimits.maxGuests + 1,
          now: now,
        ),
        contains('Guests must be between'),
      );
    });

    test('monthly requires a future move-in and sane occupants', () {
      final today = DateTime(2026, 10, 9);
      expect(StayValidation.monthly(moveIn: today, occupants: 1, now: now), isNull);
      expect(StayValidation.monthly(moveIn: null, occupants: 1, now: now), 'Choose a move-in date');
      expect(
        StayValidation.monthly(moveIn: today.subtract(const Duration(days: 1)), occupants: 1, now: now),
        'Move-in can’t be in the past',
      );
      expect(StayValidation.monthly(moveIn: today, occupants: 0, now: now), contains('Occupants must be between'));
    });
  });

  group('Search parameters', () {
    test('short stay sends dates, guests and the short-term kind', () {
      final parameters = listingSearchParameters(
        ExploreQuery(
          category: ListingCategory.apartment,
          text: '  Apas ',
          rentMode: RentMode.shortStay,
          stay: ShortStaySearch(checkIn: DateTime(2026, 10, 20), checkOut: DateTime(2026, 10, 22), guests: 3),
        ),
      );
      expect(parameters, {
        'intent': 'RENT',
        'q': 'Apas',
        'propertyType': 'APARTMENT',
        'kind': 'SHORT_TERM',
        'checkIn': '2026-10-20',
        'checkOut': '2026-10-22',
        'guests': '3',
        'limit': '$kListingPageSize',
        'offset': '0',
      });
    });

    test('monthly sends move-in and occupants with the long-term kind', () {
      final parameters = listingSearchParameters(
        ExploreQuery(stay: MonthlySearch(moveIn: DateTime(2026, 11, 1), occupants: 2), maxPriceCentavos: 2500000),
      );
      expect(parameters['kind'], 'LONG_TERM');
      expect(parameters['moveIn'], '2026-11-01');
      expect(parameters['guests'], '2');
      expect(parameters['maxPrice'], '2500000');
      expect(parameters.containsKey('checkIn'), isFalse);
    });

    test('a buy search never sends price, rent kind, stay or pets', () {
      final parameters = listingSearchParameters(
        ExploreQuery(
          intent: MarketIntent.buy,
          category: ListingCategory.house,
          quickFilters: const {QuickFilter.petFriendly, QuickFilter.preSelling, QuickFilter.furnished},
          rentMode: RentMode.monthly,
          stay: MonthlySearch(moveIn: DateTime(2026, 11, 1), occupants: 2),
          maxPriceCentavos: 500000000,
          sort: ExploreSort.priceHighToLow,
          buy: const BuyRefinement(minBedrooms: 3, minBathrooms: 2, minFloorAreaSqm: 120),
        ),
      );
      expect(parameters['intent'], 'SALE');
      expect(parameters['propertyType'], 'HOUSE');
      expect(parameters['saleStatus'], 'PRE_SELLING');
      expect(parameters['furnished'], 'true');
      expect(parameters['bedrooms'], '3');
      expect(parameters['bathrooms'], '2');
      expect(parameters['minFloorArea'], '120');
      for (final key in ['maxPrice', 'minPrice', 'kind', 'moveIn', 'checkIn', 'guests', 'petsAllowed', 'sort']) {
        expect(parameters.containsKey(key), isFalse, reason: key);
      }
    });

    test('quick filters map to real server filters', () {
      final parameters = listingSearchParameters(
        const ExploreQuery(
          quickFilters: {QuickFilter.furnished, QuickFilter.petFriendly, QuickFilter.virtualTour, QuickFilter.pool},
        ),
      );
      expect(parameters['furnished'], 'true');
      expect(parameters['petsAllowed'], 'true');
      expect(parameters['hasTour'], 'true');
      expect(parameters['amenity'], 'pool');
    });

    test('near me sends coarse coordinates, a radius and distance sort', () {
      final parameters = listingSearchParameters(
        const ExploreQuery(),
        place: NearMePlace(
          const DevicePosition(latitude: 7.073456, longitude: 125.612789),
          capturedAt: DateTime(2026, 10, 9),
        ),
      );
      expect(parameters['lat'], '7.073');
      expect(parameters['lng'], '125.613');
      expect(parameters['radiusKm'], '$kNearbyRadiusKm');
      expect(parameters['sort'], 'DISTANCE');
    });

    test('a chosen city filters by city and anywhere sends no location', () {
      expect(listingSearchParameters(const ExploreQuery(), place: const AreaPlace('Davao City'))['city'], 'Davao City');
      final anywhere = listingSearchParameters(const ExploreQuery());
      expect(anywhere.keys, isNot(contains('lat')));
      expect(anywhere.keys, isNot(contains('city')));
      expect(anywhere.keys, isNot(contains('sort')));
    });

    test('nearest sort without coordinates is not sent to the server', () {
      expect(listingSearchParameters(const ExploreQuery(sort: ExploreSort.nearest)).containsKey('sort'), isFalse);
    });

    test('pagination is expressed as offset and limit', () {
      final parameters = listingSearchParameters(const ExploreQuery(), offset: 40, limit: 10);
      expect(parameters['offset'], '40');
      expect(parameters['limit'], '10');
    });

    test('recommendations carry intent, category and place only', () {
      expect(
        recommendationParameters(
          intent: MarketIntent.buy,
          place: const AreaPlace('Cebu City'),
          category: ListingCategory.condo,
        ),
        {'intent': 'SALE', 'propertyType': 'CONDO', 'limit': '10', 'city': 'Cebu City'},
      );
    });
  });
}
