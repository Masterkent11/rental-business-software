import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

import '../../ports/repositories/auth_repository.port.dart';

class SupabaseAuthRepositoryAdapter implements AuthRepository {
  SupabaseAuthRepositoryAdapter(this._client);

  final supabase.SupabaseClient _client;

  @override
  String? get accessToken => _client.auth.currentSession?.accessToken;

  @override
  Stream<void> get changes => _client.auth.onAuthStateChange;

  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {
    await _client.auth.signInWithPassword(email: email, password: password);
  }

  @override
  Future<void> signUpWithPassword({
    required String email,
    required String password,
  }) async {
    await _client.auth.signUp(email: email, password: password);
  }

  @override
  Future<void> sendMobileOtp(String mobile) async {
    await _client.auth.signInWithOtp(phone: mobile);
  }

  @override
  Future<void> verifyMobileOtp({
    required String mobile,
    required String code,
  }) async {
    await _client.auth.verifyOTP(
      phone: mobile,
      token: code,
      type: supabase.OtpType.sms,
    );
  }

  @override
  Future<void> signOut() async {
    await _client.auth.signOut();
  }
}

typedef SupabaseAuthRepository = SupabaseAuthRepositoryAdapter;

class UnavailableAuthRepository implements AuthRepository {
  const UnavailableAuthRepository();

  @override
  String? get accessToken => null;

  @override
  Stream<void> get changes => const Stream<void>.empty();

  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {
    throw UnsupportedError('Authentication is not configured in this build');
  }

  @override
  Future<void> signUpWithPassword({
    required String email,
    required String password,
  }) async {
    throw UnsupportedError('Authentication is not configured in this build');
  }

  @override
  Future<void> sendMobileOtp(String mobile) async {
    throw UnsupportedError('Authentication is not configured in this build');
  }

  @override
  Future<void> verifyMobileOtp({
    required String mobile,
    required String code,
  }) async {
    throw UnsupportedError('Authentication is not configured in this build');
  }

  @override
  Future<void> signOut() async {}
}
