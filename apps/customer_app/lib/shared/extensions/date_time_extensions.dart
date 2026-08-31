import 'package:intl/intl.dart';

extension DateTimeFormatting on DateTime {
  String toStandardDate() => DateFormat('MMM d, yyyy').format(this);
  String toMonthDay() => DateFormat('MMM d').format(this);
}
