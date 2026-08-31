abstract interface class TokenStorage {
  Future<String?> getAccessToken();
  Future<void> saveAccessToken(String token);
  Future<void> clear();
}

typedef TokenStoragePort = TokenStorage;
