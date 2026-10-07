abstract final class DateRangeValidator {
  static DateTime normalize(DateTime date) =>
      DateTime(date.year, date.month, date.day);

  static bool isNotPast(DateTime date, {DateTime? now}) {
    final today = normalize(now ?? DateTime.now());
    return !normalize(date).isBefore(today);
  }

  static bool isValidShortStay({
    required DateTime checkIn,
    required DateTime checkOut,
    DateTime? now,
  }) {
    if (!isNotPast(checkIn, now: now)) return false;
    return normalize(checkOut).isAfter(normalize(checkIn));
  }

  static bool isValidMoveIn({
    required DateTime moveInDate,
    DateTime? now,
  }) {
    return isNotPast(moveInDate, now: now);
  }
}
