import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'auth_repository.dart';
import 'listing_query.dart';
import 'listing_repository.dart';

class BookingHoldView {
  const BookingHoldView({
    required this.id,
    required this.resourceId,
    required this.nights,
    required this.expiresAt,
    this.quote,
  });

  final String id;
  final String resourceId;
  final int nights;
  final DateTime? expiresAt;
  final StayQuote? quote;
}

class PaymentIntentView {
  const PaymentIntentView({
    required this.paymentId,
    required this.amountCentavos,
    required this.nights,
    required this.provider,
  });

  final String paymentId;
  final int amountCentavos;
  final int nights;
  final String provider;

  bool get isSandbox => provider == 'sandbox';
}

class SandboxConfirmationView {
  const SandboxConfirmationView({required this.applied, required this.stayId});

  final bool applied;

  final String? stayId;
}

enum BookingBucket { upcoming, current, pendingPayment, past, cancelled }

class BookingSummaryView {
  const BookingSummaryView({
    required this.id,
    required this.reference,
    required this.listingId,
    required this.listingTitle,
    required this.propertyName,
    required this.areaLabel,
    required this.cityLabel,
    required this.photo,
    required this.guests,
    required this.startsOn,
    required this.endsOn,
    required this.nights,
    required this.bucket,
    required this.statusLabel,
    required this.paidCentavos,
    required this.paidAt,
    required this.holdExpiresAt,
    required this.conversationId,
  });

  final String id;
  final String reference;
  final String? listingId;
  final String listingTitle;
  final String propertyName;
  final String areaLabel;
  final String cityLabel;
  final String? photo;
  final int? guests;
  final DateTime startsOn;
  final DateTime endsOn;
  final int nights;
  final BookingBucket bucket;
  final String statusLabel;
  final int paidCentavos;
  final DateTime? paidAt;
  final DateTime? holdExpiresAt;
  final String? conversationId;

  bool get isPaid => paidCentavos > 0;

  bool get isActive =>
      bucket == BookingBucket.upcoming || bucket == BookingBucket.current || bucket == BookingBucket.pendingPayment;

  static BookingSummaryView fromJson(Map<String, dynamic> json) => BookingSummaryView(
        id: json['id'] as String,
        reference: json['reference'] as String? ?? '',
        listingId: json['listingId'] as String?,
        listingTitle: json['listingTitle'] as String? ?? '',
        propertyName: json['propertyName'] as String? ?? '',
        areaLabel: json['areaLabel'] as String? ?? '',
        cityLabel: json['cityLabel'] as String? ?? '',
        photo: json['photo'] as String?,
        guests: (json['guests'] as num?)?.toInt(),
        startsOn: DateTime.parse(json['startsOn'] as String),
        endsOn: DateTime.parse(json['endsOn'] as String),
        nights: (json['nights'] as num?)?.toInt() ?? 0,
        bucket: switch (json['bucket']) {
          'CURRENT' => BookingBucket.current,
          'PENDING_PAYMENT' => BookingBucket.pendingPayment,
          'PAST' => BookingBucket.past,
          'CANCELLED' => BookingBucket.cancelled,
          _ => BookingBucket.upcoming,
        },
        statusLabel: json['statusLabel'] as String? ?? '',
        paidCentavos: (json['paidCentavos'] as num?)?.toInt() ?? 0,
        paidAt: json['paidAt'] == null ? null : DateTime.parse(json['paidAt'] as String),
        holdExpiresAt: json['holdExpiresAt'] == null ? null : DateTime.parse(json['holdExpiresAt'] as String),
        conversationId: json['conversationId'] as String?,
      );
}

class BookingRepository {
  BookingRepository(this._api);

  final ApiClient _api;

  Future<BookingHoldView> createBooking({
    required String listingId,
    required DateTime startsOn,
    required DateTime endsOn,
    required int guests,
    required String idempotencyKey,
  }) async {
    final json = await _api.sendJson(
      'POST',
      '/bookings',
      body: {
        'listingId': listingId,
        'startsOn': isoDay(startsOn),
        'endsOn': isoDay(endsOn),
        'guests': guests,
        'idempotencyKey': idempotencyKey,
      },
    );
    return BookingHoldView(
      id: json['id'] as String,
      resourceId: json['resourceId'] as String,
      nights: (json['nights'] as num?)?.toInt() ?? 0,
      expiresAt: json['expiresAt'] == null ? null : DateTime.parse(json['expiresAt'] as String),
      quote: json['quote'] is Map<String, dynamic>
          ? StayQuote.fromJson({...json['quote'] as Map<String, dynamic>, 'available': true})
          : null,
    );
  }

  Future<PaymentIntentView> startPaymentIntent(String occupancyId) async {
    final json = await _api.sendJson('POST', '/bookings/$occupancyId/payment-intent');
    return PaymentIntentView(
      paymentId: json['paymentId'] as String,
      amountCentavos: (json['amountCentavos'] as num).toInt(),
      nights: (json['nights'] as num?)?.toInt() ?? 0,
      provider: json['provider'] as String? ?? 'sandbox',
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

  Future<List<BookingSummaryView>> myBookings() async {
    final json = await _api.getJson('/me/bookings');
    return (json['bookings'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(BookingSummaryView.fromJson)
        .toList(growable: false);
  }

  Future<BookingSummaryView?> myBooking(String id) async {
    try {
      return BookingSummaryView.fromJson(await _api.getJson('/me/bookings/$id'));
    } on ApiException catch (error) {
      if (error.isNotFound) return null;
      rethrow;
    }
  }
}

final bookingRepositoryProvider = Provider<BookingRepository>(
  (ref) => BookingRepository(ref.watch(apiClientProvider)),
);

final myBookingsProvider = FutureProvider<List<BookingSummaryView>>((ref) async {
  ref.watch(sessionProvider);
  if (ref.watch(authRepositoryProvider).accessToken == null) return const [];
  try {
    return await ref.watch(bookingRepositoryProvider).myBookings();
  } on ApiException catch (error) {
    if (error.isUnauthorized) return const [];
    rethrow;
  }
});

final myBookingProvider = FutureProvider.autoDispose.family<BookingSummaryView?, String>((ref, id) async {
  ref.watch(sessionProvider);
  if (ref.watch(authRepositoryProvider).accessToken == null) return null;
  try {
    return await ref.watch(bookingRepositoryProvider).myBooking(id);
  } on ApiException catch (error) {
    if (error.isUnauthorized) return null;
    rethrow;
  }
});
