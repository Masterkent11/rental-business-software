import '../../domain/entities/booking_hold.entity.dart';
import '../../domain/entities/payment_intent.entity.dart';
import '../../domain/entities/stay_receipt.entity.dart';

abstract interface class BookingRepository {
  Future<List<StayReceipt>> mine();
  Future<StayReceipt?> byId(String id);
  Future<BookingHold> placeHold({
    required String resourceId,
    required DateTime startsOn,
    required DateTime endsOn,
  });
  Future<PaymentIntent> startPaymentIntent(String holdId);
  Future<({bool applied, String stayId})> confirmSandboxPayment({
    required String occupancyId,
    required String paymentId,
  });
  Future<void> cancel(String id);
}
