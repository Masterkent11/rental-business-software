import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

import '../app/bootstrap/app_bootstrap.dart';

class AuthFailure implements Exception {
  const AuthFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

enum SignUpOutcome { signedIn, confirmEmail }

abstract interface class AuthGateway {
  String? get accessToken;

  String? get userId;

  String? get email;

  Stream<void> get changes;

  Future<void> signInWithPassword({
    required String email,
    required String password,
  });

  Future<SignUpOutcome> signUpWithPassword({
    required String email,
    required String password,
    required String fullName,
  });

  Future<void> sendPasswordReset(String email);

  Future<void> signOut();
}

String friendlyAuthMessage(Object error) {
  final raw = switch (error) {
    supabase.AuthException(:final message) => message,
    _ => error.toString(),
  }
      .toLowerCase();
  if (raw.contains('invalid login') || raw.contains('invalid credentials')) {
    return 'That email and password don’t match an account.';
  }
  if (raw.contains('already registered') || raw.contains('already exists')) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (raw.contains('email not confirmed')) {
    return 'Confirm your email first — check your inbox for the link.';
  }
  if (raw.contains('password') && (raw.contains('weak') || raw.contains('at least'))) {
    return 'Choose a stronger password with at least 8 characters.';
  }
  if (raw.contains('rate limit') || raw.contains('too many')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (raw.contains('socket') ||
      raw.contains('network') ||
      raw.contains('failed host lookup') ||
      raw.contains('clientexception')) {
    return 'Can’t reach the server. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

class SupabaseAuthGateway implements AuthGateway {
  SupabaseAuthGateway(this._client);

  final supabase.SupabaseClient _client;

  @override
  String? get accessToken => _client.auth.currentSession?.accessToken;

  @override
  String? get userId => _client.auth.currentUser?.id;

  @override
  String? get email => _client.auth.currentUser?.email;

  @override
  Stream<void> get changes => _client.auth.onAuthStateChange;

  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {
    try {
      await _client.auth.signInWithPassword(email: email, password: password);
    } catch (error) {
      throw AuthFailure(friendlyAuthMessage(error));
    }
  }

  @override
  Future<SignUpOutcome> signUpWithPassword({
    required String email,
    required String password,
    required String fullName,
  }) async {
    try {
      final response = await _client.auth.signUp(
        email: email,
        password: password,
        data: {'full_name': fullName},
      );
      final identities = response.user?.identities;
      if (response.user != null && identities != null && identities.isEmpty) {
        throw const AuthFailure(
          'An account with this email already exists. Try signing in.',
        );
      }
      return response.session != null ? SignUpOutcome.signedIn : SignUpOutcome.confirmEmail;
    } on AuthFailure {
      rethrow;
    } catch (error) {
      throw AuthFailure(friendlyAuthMessage(error));
    }
  }

  @override
  Future<void> sendPasswordReset(String email) async {
    try {
      await _client.auth.resetPasswordForEmail(email);
    } catch (error) {
      throw AuthFailure(friendlyAuthMessage(error));
    }
  }

  @override
  Future<void> signOut() => _client.auth.signOut();
}

class UnavailableAuthGateway implements AuthGateway {
  const UnavailableAuthGateway();

  static const _message = 'Sign-in is unavailable until the app finishes starting.';

  @override
  String? get accessToken => null;

  @override
  String? get userId => null;

  @override
  String? get email => null;

  @override
  Stream<void> get changes => const Stream<void>.empty();

  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async =>
      throw const AuthFailure(_message);

  @override
  Future<SignUpOutcome> signUpWithPassword({
    required String email,
    required String password,
    required String fullName,
  }) async =>
      throw const AuthFailure(_message);

  @override
  Future<void> sendPasswordReset(String email) async => throw const AuthFailure(_message);

  @override
  Future<void> signOut() async {}
}

final authRepositoryProvider = Provider<AuthGateway>((ref) {
  final bootstrapState = ref.watch(appBootstrapStateProvider);
  if (!bootstrapState.isReady) {
    return const UnavailableAuthGateway();
  }
  return SupabaseAuthGateway(supabase.Supabase.instance.client);
});

final sessionProvider = StreamProvider<void>((ref) {
  return ref.watch(authRepositoryProvider).changes;
});

final isSignedInProvider = Provider<bool>((ref) {
  ref.watch(sessionProvider);
  return ref.watch(authRepositoryProvider).accessToken != null;
});

final currentUserIdProvider = Provider<String?>((ref) {
  ref.watch(sessionProvider);
  return ref.watch(authRepositoryProvider).userId;
});
