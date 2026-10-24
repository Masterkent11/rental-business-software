import 'package:intl/intl.dart';

DateTime manilaDay(DateTime instant) {
  final value = instant.toUtc().add(const Duration(hours: 8));
  return DateTime.utc(value.year, value.month, value.day);
}

String peso(int centavos) =>
    NumberFormat.currency(locale: 'en_PH', symbol: '₱', decimalDigits: centavos % 100 == 0 ? 0 : 2)
        .format(centavos / 100);

String dueLabel(DateTime due, DateTime now) {
  final days = DateTime.utc(due.year, due.month, due.day).difference(manilaDay(now)).inDays;
  if (days == 0) return 'Due today';
  if (days < 0) return '${-days} ${days == -1 ? 'day' : 'days'} overdue';
  return 'In $days ${days == 1 ? 'day' : 'days'}';
}

class TenantInvoice {
  const TenantInvoice(
      {required this.id,
      required this.number,
      required this.dueOn,
      required this.total,
      required this.paid,
      required this.outstanding,
      required this.state,
      required this.onlinePaymentAvailable,
      this.lines = const []});
  final String id;
  final int number;
  final DateTime dueOn;
  final int total, paid, outstanding;
  final String state;
  final bool onlinePaymentAvailable;
  final List<({String description, int amount})> lines;
}

class TenantHome {
  const TenantHome(
      {required this.id,
      required this.title,
      required this.unit,
      required this.address,
      required this.area,
      required this.propertyType,
      required this.description,
      required this.landlordName,
      this.listingId,
      this.startsOn,
      this.endsOn,
      this.latitude,
      this.longitude,
      this.photos = const [],
      this.amenities = const [],
      this.rules = const [],
      this.invoices = const [],
      this.asOf});
  final String id, title, unit, address, area, propertyType, description, landlordName;
  final String? listingId;
  final DateTime? startsOn, endsOn;
  final double? latitude, longitude;
  final List<String> photos, amenities, rules;
  final List<TenantInvoice> invoices;
  final DateTime? asOf;
  DateTime get today => asOf ?? DateTime.now();

  String get subtitle => [unit, address].where((value) => value.isNotEmpty).join(' • ');
  String get hero => photos.isEmpty ? '' : photos.first;
  DateTime? get lastDay => endsOn?.subtract(const Duration(days: 1));
  String get leaseDates =>
      '${startsOn == null ? 'Start date unavailable' : DateFormat('MMM d, yyyy').format(startsOn!)} – ${lastDay == null ? 'Open-ended' : DateFormat('MMM d, yyyy').format(lastDay!)}';
  TenantInvoice? get nextInvoice {
    final outstanding = invoices.where((invoice) => invoice.outstanding > 0 && invoice.state != 'PAID').toList()
      ..sort((a, b) => a.dueOn.compareTo(b.dueOn));
    return outstanding.isEmpty ? null : outstanding.first;
  }

  double progress(DateTime now) {
    if (startsOn == null || endsOn == null) return 0;
    final total = endsOn!.difference(startsOn!).inDays;
    if (total <= 0) return 1;
    return (manilaDay(now).difference(startsOn!).inDays / total).clamp(0, 1).toDouble();
  }

  String remaining(DateTime now) {
    final today = manilaDay(now);
    if (startsOn != null && today.isBefore(startsOn!)) return 'Starts ${DateFormat('MMM d').format(startsOn!)}';
    if (endsOn == null) return 'Open-ended lease';
    final days = endsOn!.difference(today).inDays;
    if (days <= 0) return 'Lease ended';
    final months = (endsOn!.year - today.year) * 12 + endsOn!.month - today.month - (endsOn!.day < today.day ? 1 : 0);
    if (months > 0) return '$months ${months == 1 ? 'month' : 'months'} remaining';
    return '$days ${days == 1 ? 'day' : 'days'} remaining';
  }
}

class CustomerExperience {
  const CustomerExperience(
      {this.capabilities = const ['EXPLORE', 'TRIPS', 'APPLICATION_TRACKING'],
      this.tenancies = const [],
      this.upcoming = const [],
      this.history = const [],
      this.pendingApplications = 0,
      this.approvedApplications = 0,
      this.hasTrips = false});
  final List<String> capabilities;
  final List<TenantHome> tenancies, upcoming, history;
  final int pendingApplications, approvedApplications;
  final bool hasTrips;
  bool get myHomeAvailable => capabilities.contains('MY_HOME') && tenancies.isNotEmpty;
}
