import 'local_storage.port.dart';

/// Port for secure key-value storage (tokens, auth secrets).
abstract interface class SecureStorage implements LocalStorage {}

/// In-memory secure storage adapter for testing or default environments.
class InMemorySecureStorage extends InMemoryLocalStorage implements SecureStorage {}
