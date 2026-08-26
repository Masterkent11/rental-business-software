import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

/// Sign-in, sign-out, and the current session.
///
/// An interface rather than a concrete Supabase class, for the same reason
/// ADR-0001 gives on the server: Supabase is infrastructure, and the app should
/// not be written against it. Nothing above this file mentions a Supabase type,
/// so replacing the provider is one new implementation.
///
/// Note what is absent: any way to read a capability. Supabase Auth answers
/// *who*; what that person may do is resolved server-side per request
/// (ADR-0007), and a client that read authority out of a token would be a
/// second, staler source of it.
abstract interface class AuthGateway {
  /// The bearer token for API calls, or null when signed out.
  String? get accessToken;

  /// Emits whenever sign-in state changes — including background refresh.
  Stream<void> get changes;

  Future<void> signInWithPassword({
    required String email,
    required String password,
  });

  Future<void> signUpWithPassword({
    required String email,
    required String password,
  });

  /// Mobile + OTP: a first-class method, not a fallback. A phone number is the
  /// identifier most Philippine tenants actually have and remember.
  Future<void> sendMobileOtp(String mobile);

  Future<void> verifyMobileOtp({
    required String mobile,
    required String code,
  });

  Future<void> signOut();
}

/// The Supabase implementation.
///
/// The SDK keeps the refresh token in the platform keychain/keystore and
/// refreshes in the background — the storage the architecture requires, and
/// never shared preferences.
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

/// Signed out, and unable to sign in.
///
/// The default when Supabase was never initialised — tests, and any build that
/// deliberately runs without auth. It fails loudly on a sign-in attempt rather
/// than pretending to work.
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
  try {
    return SupabaseAuthGateway(supabase.Supabase.instance.client);
  } catch (_) {
    // Supabase was never initialised. Signed out is the honest answer; the
    // alternative is every screen throwing on a getter.
    return const UnavailableAuthGateway();
  }
});

/// Ticks whenever sign-in state changes. Watched by anything that must re-read
/// after a sign-in or sign-out.
final sessionProvider = StreamProvider<void>((ref) {
  return ref.watch(authRepositoryProvider).changes;
});

/// Whether anyone is signed in.
final isSignedInProvider = Provider<bool>((ref) {
  ref.watch(sessionProvider);
  return ref.watch(authRepositoryProvider).accessToken != null;
});
