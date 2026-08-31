abstract interface class AuthRepository {
  String? get accessToken;
  Stream<void> get changes;
  Future<void> signInWithPassword({
    required String email,
    required String password,
  });
  Future<void> signUpWithPassword({
    required String email,
    required String password,
  });
  Future<void> sendMobileOtp(String mobile);
  Future<void> verifyMobileOtp({
    required String mobile,
    required String code,
  });
  Future<void> signOut();
}

typedef AuthGateway = AuthRepository;
