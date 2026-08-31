import '../../domain/entities/rental_application.entity.dart';
import '../../ports/repositories/application_repository.port.dart';

class GetApplicationByIdUseCase {
  const GetApplicationByIdUseCase(this._repo);
  final ApplicationRepository _repo;

  Future<RentalApplication?> call(String id) => _repo.byId(id);
  Future<RentalApplication?> execute(String id) => _repo.byId(id);
}
