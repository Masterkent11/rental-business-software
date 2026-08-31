import '../../domain/entities/account_profile.entity.dart';
import '../../ports/repositories/account_repository.port.dart';

class GetAccountProfileUseCase {
  const GetAccountProfileUseCase(this._repo);
  final AccountRepository _repo;

  Future<AccountProfile?> call() => _repo.getProfile();
  Future<AccountProfile?> execute() => _repo.getProfile();
}
