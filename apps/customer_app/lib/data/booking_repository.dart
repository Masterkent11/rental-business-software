import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'listing_repository.dart';

class BookingHoldView {
  const BookingHoldView({
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

class PaymentIntentView {
  const PaymentIntentView({
    required this.paymentId,
    required this.amountCentavos,
    required this.nights,
  });

  final String paymentId;
  final int amountCentavos;
  final int nights;
}

class SandboxConfirmationView {
  const SandboxConfirmationView({required this.applied, required this.stayId});

  final bool applied;

  final String? stayId;
}

class BookingRepository {
  BookingRepository(this._api);

  final ApiClient _api;

  Future<BookingHoldView> placeHold({
    required String resourceId,
    required DateTime startsOn,
    required DateTime endsOn,
  }) async {
    final json = await _api.sendJson(
      'POST',
      '/bookings',
      body: {
        'resourceId': resourceId,
        'startsOn': _iso(startsOn),
        'endsOn': _iso(endsOn),
      },
    );
    return BookingHoldView(
      id: json['id'] as String,
      resourceId: json['resourceId'] as String,
      nights: (json['nights'] as num?)?.toInt() ?? 0,
      expiresAt: json['expiresAt'] == null
          ? null
          : DateTime.parse(json['expiresAt'] as String),
    );
  }

  Future<PaymentIntentView> startPaymentIntent(String occupancyId) async {
    final json = await _api.sendJson(
      'POST',
      '/bookings/$occupancyId/payment-intent',
    );
    return PaymentIntentView(
      paymentId: json['paymentId'] as String,
      amountCentavos: (json['amountCentavos'] as num).toInt(),
      nights: (json['nights'] as num?)?.toInt() ?? 0,
    );
  }

  Future<SandboxConfirmationView> confirmSandboxPayment({
    required String occupancyId,
    required String paymentId,
  }) async {
    final json = await _api.sendJson(
      'POST',
      '/bookings/$occupancyId/payment-intent/confirm-sandbox',
      body: {'paymentId': paymentId},
    );
    return SandboxConfirmationView(
      applied: json['applied'] as bool? ?? false,
      stayId: json['stayId'] as String?,
    );
  }

  static String _iso(DateTime day) =>
      '${day.year.toString().padLeft(4, '0')}-'
      '${day.month.toString().padLeft(2, '0')}-'
      '${day.day.toString().padLeft(2, '0')}';
}

final bookingRepositoryProvider = Provider<BookingRepository>(
  (ref) => BookingRepository(ref.watch(apiClientProvider)),
);
