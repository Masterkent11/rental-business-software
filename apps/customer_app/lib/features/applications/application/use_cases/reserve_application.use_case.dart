import '../../ports/repositories/application_repository.port.dart';

class ReserveApplicationUseCase {
  const ReserveApplicationUseCase(this._repo);
  final ApplicationRepository _repo;

  Future<({String occupancyId, int feeCentavos})> call(String id) => _repo.reserve(id);
  Future<({String occupancyId, int feeCentavos})> execute(String id) => _repo.reserve(id);
}
