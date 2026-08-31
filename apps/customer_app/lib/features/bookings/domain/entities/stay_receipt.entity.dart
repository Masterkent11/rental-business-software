import '../value_objects/booking_status.value_object.dart';

/// Domain entity representing a customer stay / booking receipt.
class StayReceipt {
  const StayReceipt({
    required this.id,
    required this.reference,
    required this.listingTitle,
    required this.propertyName,
    required this.areaLabel,
    required this.cityLabel,
    required this.startsOn,
    required this.endsOn,
    required this.nights,
    required this.paidCentavos,
    required this.paidAt,
    required this.state,
    required this.photo,
    required this.stateLabel,
    required this.bucket,
  });

  final String id;
  final String reference;
  final String listingTitle;
  final String propertyName;
  final String areaLabel;
  final String cityLabel;
  final DateTime startsOn;
  final DateTime endsOn;
  final int nights;
  final int paidCentavos;
  final DateTime? paidAt;
  final String state;
  final String? photo;
  final String stateLabel;
  final BookingStatus bucket;

  bool get isPaid => paidCentavos > 0 && paidAt != null;
}
