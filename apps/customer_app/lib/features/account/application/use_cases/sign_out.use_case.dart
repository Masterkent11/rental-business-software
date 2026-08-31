import '../../ports/repositories/auth_repository.port.dart';

class SignOutUseCase {
  const SignOutUseCase(this._repo);
  final AuthRepository _repo;

  Future<void> call() => _repo.signOut();
  Future<void> execute() => _repo.signOut();
}
