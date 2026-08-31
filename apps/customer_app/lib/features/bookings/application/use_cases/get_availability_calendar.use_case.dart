import '../../domain/entities/night_availability.entity.dart';
import '../../ports/repositories/availability_repository.port.dart';

class GetAvailabilityCalendarUseCase {
  const GetAvailabilityCalendarUseCase(this._repo);
  final AvailabilityRepository _repo;

  Future<List<NightAvailability>> call({
    required String resourceId,
    required DateTime from,
    required DateTime to,
  }) =>
      _repo.nights(resourceId: resourceId, from: from, to: to);

  Future<List<NightAvailability>> execute({
    required String resourceId,
    required DateTime from,
    required DateTime to,
  }) =>
      _repo.nights(resourceId: resourceId, from: from, to: to);
}
