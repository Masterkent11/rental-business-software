abstract final class OccupancyLimits {
  static const int minGuests = 1;
  static const int maxGuests = 16;
}

abstract final class StayValidation {
  static DateTime day(DateTime date) => DateTime(date.year, date.month, date.day);

  static bool isNotPast(DateTime date, {required DateTime now}) => !day(date).isBefore(day(now));

  static String? shortStay({
    required DateTime? checkIn,
    required DateTime? checkOut,
    required int guests,
    required DateTime now,
  }) {
    if (checkIn == null) return 'Choose a check-in date';
    if (checkOut == null) return 'Choose a check-out date';
    if (!isNotPast(checkIn, now: now)) return 'Check-in can’t be in the past';
    if (!day(checkOut).isAfter(day(checkIn))) return 'Check-out must be after check-in';
    if (guests < OccupancyLimits.minGuests || guests > OccupancyLimits.maxGuests) {
      return 'Guests must be between ${OccupancyLimits.minGuests} and ${OccupancyLimits.maxGuests}';
    }
    return null;
  }

  static String? monthly({required DateTime? moveIn, required int occupants, required DateTime now}) {
    if (moveIn == null) return 'Choose a move-in date';
    if (!isNotPast(moveIn, now: now)) return 'Move-in can’t be in the past';
    if (occupants < OccupancyLimits.minGuests || occupants > OccupancyLimits.maxGuests) {
      return 'Occupants must be between ${OccupancyLimits.minGuests} and ${OccupancyLimits.maxGuests}';
    }
    return null;
  }
}
