import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

abstract interface class PreferencesStore {
  Future<String?> read(String key);
  Future<List<String>> readList(String key);
  Future<void> write(String key, String value);
  Future<void> writeList(String key, List<String> values);
  Future<void> remove(String key);
}

class SharedPreferencesStore implements PreferencesStore {
  const SharedPreferencesStore();

  Future<SharedPreferences?> _prefs() async {
    try {
      return await SharedPreferences.getInstance();
    } on Exception {
      return null;
    }
  }

  @override
  Future<String?> read(String key) async => (await _prefs())?.getString(key);

  @override
  Future<List<String>> readList(String key) async => (await _prefs())?.getStringList(key) ?? const [];

  @override
  Future<void> write(String key, String value) async => (await _prefs())?.setString(key, value);

  @override
  Future<void> writeList(String key, List<String> values) async => (await _prefs())?.setStringList(key, values);

  @override
  Future<void> remove(String key) async => (await _prefs())?.remove(key);
}

class MemoryPreferencesStore implements PreferencesStore {
  final Map<String, String> _values = {};
  final Map<String, List<String>> _lists = {};

  @override
  Future<String?> read(String key) async => _values[key];

  @override
  Future<List<String>> readList(String key) async => _lists[key] ?? const [];

  @override
  Future<void> write(String key, String value) async => _values[key] = value;

  @override
  Future<void> writeList(String key, List<String> values) async => _lists[key] = List.of(values);

  @override
  Future<void> remove(String key) async {
    _values.remove(key);
    _lists.remove(key);
  }
}

final preferencesStoreProvider = Provider<PreferencesStore>((ref) => const SharedPreferencesStore());
