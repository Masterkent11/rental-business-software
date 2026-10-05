import 'package:customer_app/features/property_search/domain/date_range_validator.dart';
import 'package:customer_app/features/property_search/domain/lease_duration.dart';
import 'package:customer_app/features/property_search/domain/occupancy_limits.dart';
import 'package:customer_app/features/property_search/domain/property_search_criteria.dart';
import 'package:customer_app/features/property_search/domain/property_type.dart';
import 'package:customer_app/features/property_search/domain/rental_mode.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('DateRangeValidator', () {
    final now = DateTime(2026, 10, 10);

    test('valid short-stay date range is accepted', () {
      final checkIn = DateTime(2026, 10, 12);
      final checkOut = DateTime(2026, 10, 15);
      final valid = DateRangeValidator.isValidShortStay(
        checkIn: checkIn,
        checkOut: checkOut,
        now: now,
      );
      expect(valid, isTrue);
    });

    test('checkout <= checkin is rejected', () {
      final checkIn = DateTime(2026, 10, 15);
      final checkOutEqual = DateTime(2026, 10, 15);
      final checkOutBefore = DateTime(2026, 10, 14);

      expect(
        DateRangeValidator.isValidShortStay(
          checkIn: checkIn,
          checkOut: checkOutEqual,
          now: now,
        ),
        isFalse,
      );
      expect(
        DateRangeValidator.isValidShortStay(
          checkIn: checkIn,
          checkOut: checkOutBefore,
          now: now,
        ),
        isFalse,
      );
    });

    test('past dates are rejected', () {
      final pastDate = DateTime(2026, 10, 9);
      final futureDate = DateTime(2026, 10, 12);

      expect(DateRangeValidator.isNotPast(pastDate, now: now), isFalse);
      expect(DateRangeValidator.isNotPast(futureDate, now: now), isTrue);

      expect(
        DateRangeValidator.isValidShortStay(
          checkIn: pastDate,
          checkOut: futureDate,
          now: now,
        ),
        isFalse,
      );

      expect(
        DateRangeValidator.isValidMoveIn(
          moveInDate: pastDate,
          now: now,
        ),
        isFalse,
      );
    });
  });

  group('OccupancyLimits', () {
    test('guest limits enforcement', () {
      expect(OccupancyLimits.isValidGuests(0), isFalse);
      expect(OccupancyLimits.isValidGuests(1), isTrue);
      expect(OccupancyLimits.isValidGuests(2), isTrue);
      expect(OccupancyLimits.isValidGuests(16), isTrue);
      expect(OccupancyLimits.isValidGuests(17), isFalse);
    });

    test('occupant limits enforcement', () {
      expect(OccupancyLimits.isValidOccupants(0), isFalse);
      expect(OccupancyLimits.isValidOccupants(1), isTrue);
      expect(OccupancyLimits.isValidOccupants(16), isTrue);
      expect(OccupancyLimits.isValidOccupants(17), isFalse);
    });
  });

  group('LeaseDuration', () {
    test('lease-duration rules', () {
      expect(LeaseDuration.oneMonth.months, 1);
      expect(LeaseDuration.threeMonths.months, 3);
      expect(LeaseDuration.sixMonths.months, 6);
      expect(LeaseDuration.twelveMonths.months, 12);
      expect(LeaseDuration.flexible.months, isNull);

      expect(LeaseDuration.oneMonth.label, '1 month');
      expect(LeaseDuration.flexible.label, 'Flexible');
    });
  });

  group('PropertySearchCriteria creation', () {
    test('short-stay criteria creation', () {
      final checkIn = DateTime(2026, 10, 15);
      final checkOut = DateTime(2026, 10, 20);

      final criteria = ShortStaySearchCriteria(
        propertyType: PropertyType.apartment,
        location: 'Cebu City',
        checkIn: checkIn,
        checkOut: checkOut,
        guests: 2,
      );

      expect(criteria.rentalMode, RentalMode.shortStay);
      expect(criteria.propertyType, PropertyType.apartment);
      expect(criteria.location, 'Cebu City');
      expect(criteria.checkIn, checkIn);
      expect(criteria.checkOut, checkOut);
      expect(criteria.guests, 2);
      expect(criteria.nights, 5);
    });

    test('monthly criteria creation', () {
      final moveIn = DateTime(2026, 11, 1);

      final criteria = MonthlySearchCriteria(
        propertyType: PropertyType.condo,
        location: 'Mandaue City',
        moveInDate: moveIn,
        leaseDuration: LeaseDuration.sixMonths,
        occupants: 3,
      );

      expect(criteria.rentalMode, RentalMode.monthly);
      expect(criteria.propertyType, PropertyType.condo);
      expect(criteria.location, 'Mandaue City');
      expect(criteria.moveInDate, moveIn);
      expect(criteria.leaseDuration, LeaseDuration.sixMonths);
      expect(criteria.occupants, 3);
    });

    test('property type preservation across all values', () {
      for (final type in PropertyType.values) {
        final shortCriteria = ShortStaySearchCriteria(
          propertyType: type,
          location: 'Cebu',
          checkIn: DateTime(2026, 10, 15),
          checkOut: DateTime(2026, 10, 17),
          guests: 1,
        );
        expect(shortCriteria.propertyType, type);

        final monthlyCriteria = MonthlySearchCriteria(
          propertyType: type,
          location: 'Cebu',
          moveInDate: DateTime(2026, 11, 1),
          leaseDuration: LeaseDuration.threeMonths,
          occupants: 1,
        );
        expect(monthlyCriteria.propertyType, type);
      }
    });

    test('CTA labels adapt cleanly to property type', () {
      expect(PropertyType.apartment.searchCtaLabel, 'Search Apartments');
      expect(PropertyType.condo.searchCtaLabel, 'Search Condos');
      expect(PropertyType.house.searchCtaLabel, 'Search Houses');
      expect(PropertyType.room.searchCtaLabel, 'Search Rooms');
      expect(PropertyType.boardingHouse.searchCtaLabel, 'Search Boarding Houses');
    });
  });
}
