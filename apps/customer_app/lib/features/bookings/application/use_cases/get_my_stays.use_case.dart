import '../../domain/entities/stay_receipt.entity.dart';
import '../../ports/repositories/booking_repository.port.dart';

class GetMyStaysUseCase {
  const GetMyStaysUseCase(this._repo);
  final BookingRepository _repo;

  Future<List<StayReceipt>> call() => _repo.mine();
  Future<List<StayReceipt>> execute() => _repo.mine();
}
