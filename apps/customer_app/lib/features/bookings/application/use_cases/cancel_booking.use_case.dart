import '../../ports/repositories/booking_repository.port.dart';

class CancelBookingUseCase {
  const CancelBookingUseCase(this._repo);
  final BookingRepository _repo;

  Future<void> call(String id) => _repo.cancel(id);
  Future<void> execute(String id) => _repo.cancel(id);
}
