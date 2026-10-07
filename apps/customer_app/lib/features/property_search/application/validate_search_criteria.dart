import '../domain/date_range_validator.dart';
import '../domain/occupancy_limits.dart';

abstract final class ValidateSearchCriteria {
  static String? validateShortStay({
    required DateTime? checkIn,
    required DateTime? checkOut,
    required int guests,
    DateTime? now,
  }) {
    if (checkIn == null) return 'Please select a check-in date';
    if (checkOut == null) return 'Please select a check-out date';
    if (!DateRangeValidator.isNotPast(checkIn, now: now)) {
      return 'Check-in date cannot be in the past';
    }
    if (!DateRangeValidator.isValidShortStay(
      checkIn: checkIn,
      checkOut: checkOut,
      now: now,
    )) {
      return 'Check-out must be after check-in';
    }
    if (!OccupancyLimits.isValidGuests(guests)) {
      return 'Guests must be between ${OccupancyLimits.minGuests} and ${OccupancyLimits.maxGuests}';
    }
    return null;
  }

  static String? validateMonthly({
    required DateTime? moveInDate,
    required int occupants,
    DateTime? now,
  }) {
    if (moveInDate == null) return 'Please select a move-in date';
    if (!DateRangeValidator.isValidMoveIn(moveInDate: moveInDate, now: now)) {
      return 'Move-in date cannot be in the past';
    }
    if (!OccupancyLimits.isValidOccupants(occupants)) {
      return 'Occupants must be between ${OccupancyLimits.minOccupants} and ${OccupancyLimits.maxOccupants}';
    }
    return null;
  }
}
