import '../../ports/repositories/booking_repository.port.dart';

class ConfirmSandboxPaymentUseCase {
  const ConfirmSandboxPaymentUseCase(this._repo);
  final BookingRepository _repo;

  Future<({bool applied, String stayId})> call({
    required String occupancyId,
    required String paymentId,
  }) =>
      _repo.confirmSandboxPayment(
        occupancyId: occupancyId,
        paymentId: paymentId,
      );

  Future<({bool applied, String stayId})> execute({
    required String occupancyId,
    required String paymentId,
  }) =>
      _repo.confirmSandboxPayment(
        occupancyId: occupancyId,
        paymentId: paymentId,
      );
}
