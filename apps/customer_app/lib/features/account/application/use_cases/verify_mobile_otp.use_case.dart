import '../../ports/repositories/auth_repository.port.dart';

class VerifyMobileOtpUseCase {
  const VerifyMobileOtpUseCase(this._repo);
  final AuthRepository _repo;

  Future<void> call({required String mobile, required String code}) =>
      _repo.verifyMobileOtp(mobile: mobile, code: code);

  Future<void> execute({required String mobile, required String code}) =>
      _repo.verifyMobileOtp(mobile: mobile, code: code);
}
