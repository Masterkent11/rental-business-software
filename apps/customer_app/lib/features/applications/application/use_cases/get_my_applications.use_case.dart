import '../../domain/entities/rental_application.entity.dart';
import '../../ports/repositories/application_repository.port.dart';

class GetMyApplicationsUseCase {
  const GetMyApplicationsUseCase(this._repo);
  final ApplicationRepository _repo;

  Future<List<RentalApplication>> call() => _repo.mine();
  Future<List<RentalApplication>> execute() => _repo.mine();
}
