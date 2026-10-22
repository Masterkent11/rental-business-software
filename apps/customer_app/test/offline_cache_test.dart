import 'package:customer_app/data/offline_cache.dart';
import 'package:customer_app/data/preferences_store.dart';
import 'package:flutter_test/flutter_test.dart';

class FailingPreferences extends MemoryPreferencesStore {
  bool fail = true;
  @override
  Future<void> write(String key, String value) async {
    if (fail) {
      fail = false;
      throw StateError('Storage unavailable');
    }
    await super.write(key, value);
  }
}

void main() {
  test('a failed write does not prevent later writes or sign-out cleanup', () async {
    final cache = OfflineCache(FailingPreferences());
    await expectLater(cache.write('first', {'value': 1}), throwsStateError);
    await cache.write('second', {'value': 2});
    expect(await cache.read('second'), {'value': 2});
    await cache.clear();
    expect(await cache.read('second'), isNull);
  });
}
