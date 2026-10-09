import 'dart:async';

import 'package:customer_app/data/auth_repository.dart';

class FakeAuth implements AuthGateway {
  FakeAuth({String? token, this.userId = 'user-test', this.email = 'guest@example.test'}) : _token = token;

  factory FakeAuth.signedIn() => FakeAuth(token: 'test-token');

  String? _token;
  final _controller = StreamController<void>.broadcast();
  final List<String> passwordResets = [];

  @override
  String? get accessToken => _token;

  @override
  final String? userId;

  @override
  final String? email;

  @override
  Stream<void> get changes => _controller.stream;

  void signIn(String token) {
    _token = token;
    _controller.add(null);
  }

  @override
  Future<void> signInWithPassword({required String email, required String password}) async =>
      signIn('token-for-$email');

  @override
  Future<SignUpOutcome> signUpWithPassword({
    required String email,
    required String password,
    required String fullName,
  }) async {
    signIn('token-for-$email');
    return SignUpOutcome.signedIn;
  }

  @override
  Future<void> sendPasswordReset(String email) async => passwordResets.add(email);

  @override
  Future<void> signOut() async {
    _token = null;
    _controller.add(null);
  }
}
