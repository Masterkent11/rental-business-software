import '../../domain/entities/tour.entity.dart';
import '../../ports/repositories/tour_repository.port.dart';

class GetTourForResourceUseCase {
  const GetTourForResourceUseCase(this._repo);
  final TourRepository _repo;

  Future<Tour?> call(String resourceId) => _repo.tourForResource(resourceId);
  Future<Tour?> execute(String resourceId) => _repo.tourForResource(resourceId);
}
