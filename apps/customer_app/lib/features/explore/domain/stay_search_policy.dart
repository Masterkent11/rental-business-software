import 'explore_query.dart';
import 'stay_validation.dart';

abstract final class StaySearchPolicy {
  static const Duration shortStayLeadTime = Duration(days: 7);
  static const Duration defaultShortStayLength = Duration(days: 3);
  static const Duration minimumStayLength = Duration(days: 1);
  static const Duration monthlyLeadTime = Duration(days: 14);
  static const Duration bookingHorizon = Duration(days: 365);
  static const int defaultGuests = 2;
  static const int defaultOccupants = 1;

  static DateTime firstBookableDay(DateTime now) => StayValidation.day(now);

  static DateTime lastBookableDay(DateTime now) => firstBookableDay(now).add(bookingHorizon);

  static DateTime defaultCheckIn(DateTime now) => firstBookableDay(now).add(shortStayLeadTime);

  static DateTime defaultCheckOut(DateTime now) => defaultCheckIn(now).add(defaultShortStayLength);

  static DateTime defaultMoveIn(DateTime now) => firstBookableDay(now).add(monthlyLeadTime);

  static RentMode initialMode(List<RentMode> supported, RentMode? requested) =>
      requested != null && supported.contains(requested) ? requested : supported.first;
}
