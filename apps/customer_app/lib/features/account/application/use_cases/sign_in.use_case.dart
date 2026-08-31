import '../../ports/repositories/auth_repository.port.dart';

class SignInUseCase {
  const SignInUseCase(this._repo);
  final AuthRepository _repo;

  Future<void> call({required String email, required String password}) =>
      _repo.signInWithPassword(email: email, password: password);

  Future<void> execute({required String email, required String password}) =>
      _repo.signInWithPassword(email: email, password: password);
}
