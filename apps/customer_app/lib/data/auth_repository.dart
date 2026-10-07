import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

import '../app/bootstrap/app_bootstrap.dart';

abstract interface class AuthGateway {
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

  Future<void> verifyMobileOtp({required String mobile, required String code});

  Future<void> signOut();
}

class SupabaseAuthGateway implements AuthGateway {
  SupabaseAuthGateway(this._client);

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
  Future<void> signOut() => _client.auth.signOut();
}

class UnavailableAuthGateway implements AuthGateway {
  const UnavailableAuthGateway();

  @override
  String? get accessToken => null;

  @override
  Stream<void> get changes => const Stream<void>.empty();

  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async =>
      throw StateError('Authentication is not configured in this build');

  @override
  Future<void> signUpWithPassword({
    required String email,
    required String password,
  }) async =>
      throw StateError('Authentication is not configured in this build');

  @override
  Future<void> sendMobileOtp(String mobile) async =>
      throw StateError('Authentication is not configured in this build');

  @override
  Future<void> verifyMobileOtp({
    required String mobile,
    required String code,
  }) async =>
      throw StateError('Authentication is not configured in this build');

  @override
  Future<void> signOut() async {}
}

final authRepositoryProvider = Provider<AuthGateway>((ref) {
  final bootstrapState = ref.watch(appBootstrapStateProvider);
  if (!bootstrapState.isReady) {
    return const UnavailableAuthGateway();
  }
  try {
    return SupabaseAuthGateway(supabase.Supabase.instance.client);
  } catch (_) {
    return const UnavailableAuthGateway();
  }
});

final sessionProvider = StreamProvider<void>((ref) {
  return ref.watch(authRepositoryProvider).changes;
});

final isSignedInProvider = Provider<bool>((ref) {
  ref.watch(sessionProvider);
  return ref.watch(authRepositoryProvider).accessToken != null;
});
