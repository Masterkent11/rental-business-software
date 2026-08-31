import '../../ports/repositories/application_repository.port.dart';

class WithdrawApplicationUseCase {
  const WithdrawApplicationUseCase(this._repo);
  final ApplicationRepository _repo;

  Future<void> call(String id) => _repo.withdraw(id);
  Future<void> execute(String id) => _repo.withdraw(id);
}
