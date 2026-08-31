import '../../ports/repositories/auth_repository.port.dart';

class SendMobileOtpUseCase {
  const SendMobileOtpUseCase(this._repo);
  final AuthRepository _repo;

  Future<void> call(String mobile) => _repo.sendMobileOtp(mobile);
  Future<void> execute(String mobile) => _repo.sendMobileOtp(mobile);
}
