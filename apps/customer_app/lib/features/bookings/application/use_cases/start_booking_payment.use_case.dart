import '../../domain/entities/payment_intent.entity.dart';
import '../../ports/repositories/booking_repository.port.dart';

class StartBookingPaymentUseCase {
  const StartBookingPaymentUseCase(this._repo);
  final BookingRepository _repo;

  Future<PaymentIntent> call(String holdId) => _repo.startPaymentIntent(holdId);
  Future<PaymentIntent> execute(String holdId) => _repo.startPaymentIntent(holdId);
}
