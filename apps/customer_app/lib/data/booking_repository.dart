import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'listing_repository.dart';

/// A hold placed on nights, before payment. Mirrors `POST /bookings` exactly
/// — nothing here is computed client-side.
class BookingHoldView {
  const BookingHoldView({
    required this.id,
    required this.resourceId,
    required this.nights,
    required this.expiresAt,
  });

  /// The occupancy id. Also the booking id everywhere else in this contract.
  final String id;
  final String resourceId;
  final int nights;
  final DateTime? expiresAt;
}

/// What paying this hold costs.
///
/// `redirectUrl` from the real response is deliberately not carried here: it
/// is a non-resolvable sandbox placeholder (ADR-0008) — there is no real
/// checkout page yet for a client to use it for.
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

/// The outcome of confirming a sandbox payment.
class SandboxConfirmationView {
  const SandboxConfirmationView({required this.applied, required this.stayId});

  final bool applied;

  /// The stay this payment produced. Null only if the server genuinely
  /// applied nothing — should not happen for a nightly booking.
  final String? stayId;
}

/// Nightly bookings: hold, then pay.
///
/// Every figure here is read, not derived — the total this repository
/// reports is what `payment-intent` priced server-side off the listing, never
/// a nightly rate multiplied out on the phone.
class BookingRepository {
  BookingRepository(this._api);

  final ApiClient _api;

  /// Place a hold on nights. Throws [ApiException] with `statusCode` 404 (not
  /// bookable), 409 (nights taken), 503 (busy, try again), or 400 (bad range).
  Future<BookingHoldView> placeHold({
    required String resourceId,
    required DateTime startsOn,
    required DateTime endsOn,
  }) async {
    final json = await _api.sendJson('POST', '/bookings', body: {
      'resourceId': resourceId,
      'startsOn': _iso(startsOn),
      'endsOn': _iso(endsOn),
    });
    return BookingHoldView(
      id: json['id'] as String,
      resourceId: json['resourceId'] as String,
      nights: (json['nights'] as num?)?.toInt() ?? 0,
      expiresAt: json['expiresAt'] == null
          ? null
          : DateTime.parse(json['expiresAt'] as String),
    );
  }

  /// Start paying for a held booking. Throws [ApiException] with
  /// `statusCode` 404 when the hold is gone, expired, or already paid.
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

  /// Trigger the sandbox provider's success callback, through the same
  /// verify-and-confirm pipeline a real webhook uses. Throws [ApiException]
  /// with `statusCode` 404 when the payment is gone, already settled, or not
  /// this caller's own.
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

  static String _iso(DateTime day) => '${day.year.toString().padLeft(4, '0')}-'
      '${day.month.toString().padLeft(2, '0')}-'
      '${day.day.toString().padLeft(2, '0')}';
}

final bookingRepositoryProvider = Provider<BookingRepository>(
  (ref) => BookingRepository(ref.watch(apiClientProvider)),
);
