import 'package:customer_app/features/property_search/application/property_search_controller.dart';
import 'package:customer_app/features/property_search/application/property_search_repository.dart';
import 'package:customer_app/features/property_search/application/search_properties.dart';
import 'package:customer_app/features/property_search/application/validate_search_criteria.dart';
import 'package:customer_app/features/property_search/domain/lease_duration.dart';
import 'package:customer_app/features/property_search/domain/property_search_criteria.dart';
import 'package:customer_app/features/property_search/domain/property_type.dart';
import 'package:customer_app/features/property_search/domain/rental_mode.dart';
import 'package:customer_app/fixtures/view_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _CapturingSearchRepository implements PropertySearchRepository {
  PropertySearchCriteria? lastCriteria;
  PropertyRefinements? lastRefinements;
  int? lastOffset;
  bool shouldThrow = false;
  List<ListingCardView> Function(int offset) pages = (_) => const [];
  int total = 0;

  @override
  Future<PropertySearchPage> searchProperties(
    PropertySearchCriteria criteria, {
    int offset = 0,
    PropertyRefinements refinements = const PropertyRefinements(),
  }) async {
    lastCriteria = criteria;
    lastRefinements = refinements;
    lastOffset = offset;
    if (shouldThrow) {
      throw Exception('Network connection failure');
    }
    final items = pages(offset);
    return PropertySearchPage(items: items, total: total, hasMore: offset + items.length < total);
  }
}

ListingCardView _card(String id) => ListingCardView(
      id: id,
      resourceId: 'res-$id',
      title: 'Place $id',
      propertyName: 'Property $id',
      areaLabel: 'Lahug',
      cityLabel: 'Cebu City',
      priceCentavos: 250000,
      kind: ListingKind.shortTerm,
      resourceType: ResourceType.unit,
      availabilityLabel: 'Available',
      isAvailable: true,
      hasTour: false,
      sceneCount: 0,
      photos: const [],
    );

void main() {
  group('ValidateSearchCriteria', () {
    final now = DateTime(2026, 10, 1);

    test('validates short-stay dates and guests', () {
      expect(
        ValidateSearchCriteria.validateShortStay(
          checkIn: null,
          checkOut: DateTime(2026, 10, 5),
          guests: 2,
          now: now,
        ),
        'Please select a check-in date',
      );

      expect(
        ValidateSearchCriteria.validateShortStay(
          checkIn: DateTime(2026, 10, 5),
          checkOut: null,
          guests: 2,
          now: now,
        ),
        'Please select a check-out date',
      );

      expect(
        ValidateSearchCriteria.validateShortStay(
          checkIn: DateTime(2026, 9, 30),
          checkOut: DateTime(2026, 10, 5),
          guests: 2,
          now: now,
        ),
        'Check-in date cannot be in the past',
      );

      expect(
        ValidateSearchCriteria.validateShortStay(
          checkIn: DateTime(2026, 10, 5),
          checkOut: DateTime(2026, 10, 3),
          guests: 2,
          now: now,
        ),
        'Check-out must be after check-in',
      );

      expect(
        ValidateSearchCriteria.validateShortStay(
          checkIn: DateTime(2026, 10, 5),
          checkOut: DateTime(2026, 10, 7),
          guests: 0,
          now: now,
        ),
        contains('Guests must be between'),
      );

      expect(
        ValidateSearchCriteria.validateShortStay(
          checkIn: DateTime(2026, 10, 5),
          checkOut: DateTime(2026, 10, 7),
          guests: 2,
          now: now,
        ),
        isNull,
      );
    });

    test('validates monthly move-in and occupants', () {
      expect(
        ValidateSearchCriteria.validateMonthly(
          moveInDate: null,
          occupants: 2,
          now: now,
        ),
        'Please select a move-in date',
      );

      expect(
        ValidateSearchCriteria.validateMonthly(
          moveInDate: DateTime(2026, 9, 30),
          occupants: 2,
          now: now,
        ),
        'Move-in date cannot be in the past',
      );

      expect(
        ValidateSearchCriteria.validateMonthly(
          moveInDate: DateTime(2026, 10, 15),
          occupants: 0,
          now: now,
        ),
        contains('Occupants must be between'),
      );

      expect(
        ValidateSearchCriteria.validateMonthly(
          moveInDate: DateTime(2026, 10, 15),
          occupants: 3,
          now: now,
        ),
        isNull,
      );
    });
  });

  group('PropertySearchFormController', () {
    final now = DateTime(2026, 10, 1);

    test('retains values across mode switches without leaking into criteria', () {
      final controller = PropertySearchFormController(PropertyType.apartment);
      controller.setLocation('Cebu City');
      controller.setDates(
        checkIn: DateTime(2026, 10, 10),
        checkOut: DateTime(2026, 10, 14),
      );
      controller.setGuests(3);

      controller.setMode(RentalMode.monthly);
      controller.setMoveInDate(DateTime(2026, 11, 1));
      controller.setLeaseDuration(LeaseDuration.twelveMonths);
      controller.setOccupants(4);

      final monthlyCriteria = controller.submit(now: now);
      expect(monthlyCriteria, isA<MonthlySearchCriteria>());
      final m = monthlyCriteria as MonthlySearchCriteria;
      expect(m.rentalMode, RentalMode.monthly);
      expect(m.propertyType, PropertyType.apartment);
      expect(m.location, 'Cebu City');
      expect(m.moveInDate, DateTime(2026, 11, 1));
      expect(m.leaseDuration, LeaseDuration.twelveMonths);
      expect(m.occupants, 4);

      controller.setMode(RentalMode.shortStay);
      final shortCriteria = controller.submit(now: now);
      expect(shortCriteria, isA<ShortStaySearchCriteria>());
      final s = shortCriteria as ShortStaySearchCriteria;
      expect(s.rentalMode, RentalMode.shortStay);
      expect(s.propertyType, PropertyType.apartment);
      expect(s.location, 'Cebu City');
      expect(s.checkIn, DateTime(2026, 10, 10));
      expect(s.checkOut, DateTime(2026, 10, 14));
      expect(s.guests, 3);
    });

    test('returns null and records validation error on invalid input', () {
      final controller = PropertySearchFormController(PropertyType.condo);
      controller.setDates(
        checkIn: DateTime(2026, 10, 15),
        checkOut: DateTime(2026, 10, 10),
      );
      final result = controller.submit(now: now);
      expect(result, isNull);
      expect(controller.state.validationError, 'Check-out must be after check-in');
    });
  });

  group('SearchProperties use case and repository port', () {
    test('correct criteria reaches repository port', () async {
      final repo = _CapturingSearchRepository();
      final useCase = SearchProperties(repo);

      final criteria = ShortStaySearchCriteria(
        propertyType: PropertyType.condo,
        location: 'IT Park',
        checkIn: DateTime(2026, 10, 12),
        checkOut: DateTime(2026, 10, 14),
        guests: 2,
      );

      await useCase(criteria);

      expect(repo.lastCriteria, criteria);
      expect(repo.lastCriteria!.rentalMode, RentalMode.shortStay);
      expect(repo.lastCriteria!.propertyType, PropertyType.condo);
      expect(repo.lastCriteria!.location, 'IT Park');
    });

    test('repository errors are represented correctly in provider', () async {
      final repo = _CapturingSearchRepository()..shouldThrow = true;
      final element = ProviderContainer(
        overrides: [
          propertySearchRepositoryProvider.overrideWithValue(repo),
        ],
      );

      final criteria = MonthlySearchCriteria(
        propertyType: PropertyType.house,
        location: 'Guadalupe',
        moveInDate: DateTime(2026, 11, 1),
        leaseDuration: LeaseDuration.sixMonths,
        occupants: 2,
      );

      expect(
        element.read(propertyResultsProvider((criteria: criteria, refinements: const PropertyRefinements())).future),
        throwsA(isA<Exception>()),
      );
    });

    test('refinements are sent to the server, not applied on the device', () async {
      final repo = _CapturingSearchRepository();
      final container = ProviderContainer(
        overrides: [propertySearchRepositoryProvider.overrideWithValue(repo)],
      );
      addTearDown(container.dispose);
      final criteria = ShortStaySearchCriteria(
        propertyType: PropertyType.condo,
        location: 'Cebu City',
        checkIn: DateTime(2026, 11, 2),
        checkOut: DateTime(2026, 11, 5),
        guests: 2,
      );
      const refinements = PropertyRefinements(
        sort: PropertySortOrder.priceLowToHigh,
        maxPriceCentavos: 400000,
        minBedrooms: 2,
        keyword: 'pool',
      );

      await container.read(propertyResultsProvider((criteria: criteria, refinements: refinements)).future);

      expect(repo.lastRefinements, refinements);
      expect(repo.lastOffset, 0);
    });

    test('loads the next page from where the list ends, without duplicates', () async {
      final repo = _CapturingSearchRepository()
        ..total = 3
        ..pages = (offset) => offset == 0 ? [_card('a'), _card('b')] : [_card('b'), _card('c')];
      final container = ProviderContainer(
        overrides: [propertySearchRepositoryProvider.overrideWithValue(repo)],
      );
      addTearDown(container.dispose);
      final criteria = MonthlySearchCriteria(
        propertyType: PropertyType.apartment,
        location: 'Cebu City',
        moveInDate: DateTime(2026, 11, 1),
        leaseDuration: LeaseDuration.sixMonths,
        occupants: 1,
      );
      final query = (criteria: criteria, refinements: const PropertyRefinements());
      final sub = container.listen(propertyResultsProvider(query), (_, __) {});
      addTearDown(sub.close);

      final first = await container.read(propertyResultsProvider(query).future);
      expect(first.items.map((l) => l.id), ['a', 'b']);
      expect(first.hasMore, isTrue);

      await container.read(propertyResultsProvider(query).notifier).loadMore();

      final next = container.read(propertyResultsProvider(query)).requireValue;
      expect(repo.lastOffset, 2);
      expect(next.items.map((l) => l.id), ['a', 'b', 'c']);
      expect(next.total, 3);
    });
  });
}
