/// Domain entity representing a temporary hold placed on nights.
class BookingHold {
  const BookingHold({
    required this.id,
    required this.resourceId,
    required this.nights,
    required this.expiresAt,
  });

  final String id;
  final String resourceId;
  final int nights;
  final DateTime? expiresAt;
}
