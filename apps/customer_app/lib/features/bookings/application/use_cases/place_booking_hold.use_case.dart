import '../../domain/entities/booking_hold.entity.dart';
import '../../ports/repositories/booking_repository.port.dart';

class PlaceBookingHoldUseCase {
  const PlaceBookingHoldUseCase(this._repo);
  final BookingRepository _repo;

  Future<BookingHold> call({
    required String resourceId,
    required DateTime startsOn,
    required DateTime endsOn,
  }) =>
      _repo.placeHold(
        resourceId: resourceId,
        startsOn: startsOn,
        endsOn: endsOn,
      );

  Future<BookingHold> execute({
    required String resourceId,
    required DateTime startsOn,
    required DateTime endsOn,
  }) =>
      _repo.placeHold(
        resourceId: resourceId,
        startsOn: startsOn,
        endsOn: endsOn,
      );
}
