import '../value_objects/night_status.value_object.dart';

/// Pure domain business rules for night bookings.
abstract final class BookingRules {
  static bool areNightsAvailable(Iterable<NightStatus> statuses) {
    return statuses.every((status) => status == NightStatus.open);
  }

  static int calculateTotal(int nightlyRateCentavos, int nights) {
    return nightlyRateCentavos * nights;
  }
}
