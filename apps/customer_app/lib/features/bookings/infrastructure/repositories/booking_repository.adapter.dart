import '../../../../core/networking/api.client.dart';
import '../../../../core/networking/api.exception.dart';
import '../../domain/entities/booking_hold.entity.dart';
import '../../domain/entities/payment_intent.entity.dart';
import '../../domain/entities/stay_receipt.entity.dart';
import '../../ports/repositories/booking_repository.port.dart';
import '../dto/booking.dto.dart';
import '../mappers/booking.mapper.dart';

class BookingRepositoryAdapter implements BookingRepository {
  BookingRepositoryAdapter(this._api);

  final ApiClient _api;

  @override
  Future<List<StayReceipt>> mine() async {
    final body = await _api.getJson('/me/stays');
    final raw = (body['stays'] as List<dynamic>? ?? body['bookings'] as List<dynamic>? ?? const []);
    return raw
        .whereType<Map>()
        .map((json) => StayReceiptDto.fromJson(Map<String, dynamic>.from(json)).toDomain())
        .toList(growable: false);
  }

  @override
  Future<StayReceipt?> byId(String id) async {
    try {
      final body = await _api.getJson('/bookings/$id');
      return StayReceiptDto.fromJson(Map<String, dynamic>.from(body)).toDomain();
    } on ApiException catch (error) {
      if (error.isNotFound) return null;
      rethrow;
    }
  }

  @override
  Future<BookingHold> placeHold({
    required String resourceId,
    required DateTime startsOn,
    required DateTime endsOn,
  }) async {
    final body = await _api.postJson('/bookings', {
      'resourceId': resourceId,
      'startsOn': _iso(startsOn),
      'endsOn': _iso(endsOn),
    });
    return BookingHoldDto.fromJson(Map<String, dynamic>.from(body)).toDomain();
  }

  @override
  Future<PaymentIntent> startPaymentIntent(String holdId) async {
    final body = await _api.postJson('/bookings/$holdId/payment-intent', const {});
    return PaymentIntentDto.fromJson(Map<String, dynamic>.from(body)).toDomain();
  }

  @override
  Future<({bool applied, String stayId})> confirmSandboxPayment({
    required String occupancyId,
    required String paymentId,
  }) async {
    final body = await _api.postJson(
      '/bookings/$occupancyId/payment-intent/confirm-sandbox',
      {
        'paymentId': paymentId,
      },
    );
    return (
      applied: body['applied'] as bool? ?? false,
      stayId: body['stayId'] as String? ?? '',
    );
  }

  @override
  Future<void> cancel(String id) async {
    await _api.postJson('/bookings/$id/cancel', const {});
  }

  static String _iso(DateTime day) =>
      '${day.year.toString().padLeft(4, '0')}-'
      '${day.month.toString().padLeft(2, '0')}-'
      '${day.day.toString().padLeft(2, '0')}';
}

typedef BookingRepositoryImpl = BookingRepositoryAdapter;
