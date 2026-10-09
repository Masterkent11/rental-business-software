import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../app/clock.dart';
import 'api_client.dart';
import 'preferences_store.dart';

const List<Duration> kOfflineRetryDelays = [
  Duration(seconds: 3),
  Duration(seconds: 6),
  Duration(seconds: 12),
  Duration(seconds: 20),
];

bool isRecoverable(Object error) =>
    error is ApiException && (error.isNetwork || (error.statusCode ?? 0) >= 500 || error.statusCode == 408);

class OfflineCache {
  OfflineCache(this._store, {Clock now = DateTime.now, this.capacity = 60, this.maxAge = const Duration(days: 7)})
      : _now = now;

  static const int version = 1;
  static const String _prefix = 'offline_cache.entry.';
  static const String _indexKey = 'offline_cache.index';

  final PreferencesStore _store;
  final Clock _now;
  final int capacity;
  final Duration maxAge;
  Future<void> _pending = Future.value();

  Future<Map<String, dynamic>?> read(String key) async {
    try {
      final raw = await _store.read('$_prefix$key');
      if (raw == null) return null;
      final entry = jsonDecode(raw);
      if (entry is! Map<String, dynamic> || entry['v'] != version) return null;
      final savedAt = entry['savedAt'];
      final body = entry['body'];
      if (savedAt is! int || body is! Map<String, dynamic>) return null;
      final age = _now().difference(DateTime.fromMillisecondsSinceEpoch(savedAt));
      return age > maxAge ? null : body;
    } on FormatException {
      return null;
    }
  }

  Future<void> write(String key, Map<String, dynamic> body) => _serialise(() async {
        final entry = {'v': version, 'savedAt': _now().millisecondsSinceEpoch, 'body': body};
        await _store.write('$_prefix$key', jsonEncode(entry));
        final index = [key, ...(await _store.readList(_indexKey)).where((existing) => existing != key)];
        for (final evicted in index.skip(capacity)) {
          await _store.remove('$_prefix$evicted');
        }
        await _store.writeList(_indexKey, index.take(capacity).toList(growable: false));
      });

  Future<void> clear() => _serialise(() async {
        for (final key in await _store.readList(_indexKey)) {
          await _store.remove('$_prefix$key');
        }
        await _store.remove(_indexKey);
      });

  Future<void> _serialise(Future<void> Function() action) => _pending = _pending.then((_) => action());
}

final offlineCacheProvider = Provider<OfflineCache>(
  (ref) => OfflineCache(ref.watch(preferencesStoreProvider), now: ref.watch(clockProvider)),
);

Stream<T> cacheThenNetwork<T>({
  required OfflineCache cache,
  required String key,
  required Future<Map<String, dynamic>> Function() fetch,
  required T Function(Map<String, dynamic> body) decode,
  bool persist = true,
  List<Duration> retryDelays = kOfflineRetryDelays,
}) {
  var cancelled = false;
  Timer? retryTimer;
  Completer<void>? retryWait;
  late final StreamController<T> controller;

  Future<void> wait(Duration delay) {
    final completer = retryWait = Completer<void>();
    retryTimer = Timer(delay, completer.complete);
    return completer.future;
  }

  Future<void> run() async {
    final cached = persist ? await cache.read(key) : null;
    if (cancelled) return;
    if (cached != null) controller.add(decode(cached));
    var attempt = 0;
    while (!cancelled) {
      try {
        final body = await fetch();
        if (cancelled) return;
        if (persist) await cache.write(key, body);
        controller.add(decode(body));
        await controller.close();
        return;
      } catch (error, stackTrace) {
        if (cancelled) return;
        if (!isRecoverable(error)) {
          if (cached == null) controller.addError(error, stackTrace);
          await controller.close();
          return;
        }
        if (cached == null && attempt == 0) controller.addError(error, stackTrace);
        await wait(retryDelays[attempt < retryDelays.length ? attempt : retryDelays.length - 1]);
        attempt++;
      }
    }
  }

  controller = StreamController<T>(
    onListen: run,
    onCancel: () {
      cancelled = true;
      retryTimer?.cancel();
      final pending = retryWait;
      if (pending != null && !pending.isCompleted) pending.complete();
    },
  );
  return controller.stream;
}

bool isPersistable(Map<String, String?> query) => !query.containsKey('lat') && !query.containsKey('lng');

String cacheKey(String scope, String path, Map<String, String?> query) {
  final entries = query.entries.where((e) => e.value != null).toList()..sort((a, b) => a.key.compareTo(b.key));
  return '$scope|$path?${entries.map((e) => '${e.key}=${e.value}').join('&')}';
}
