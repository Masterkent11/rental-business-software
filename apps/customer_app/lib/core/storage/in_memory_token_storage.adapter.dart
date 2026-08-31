import 'token_storage.port.dart';

/// In-memory storage adapter for tokens (used for guest sessions or tests).
class InMemoryTokenStorage implements TokenStorage {
  String? _token;

  @override
  Future<String?> getAccessToken() async => _token;

  @override
  Future<void> saveAccessToken(String token) async {
    _token = token;
  }

  @override
  Future<void> clear() async {
    _token = null;
  }
}
