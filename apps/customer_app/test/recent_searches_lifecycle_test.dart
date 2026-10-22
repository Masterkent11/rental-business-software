import 'dart:async';

import 'package:customer_app/data/preferences_store.dart';
import 'package:customer_app/features/explore/application/search_suggestions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class DelayedSearchPreferences extends MemoryPreferencesStore {
  final started = Completer<void>();
  final result = Completer<List<String>>();

  @override
  Future<List<String>> readList(String key) {
    started.complete();
    return result.future;
  }
}

void main() {
  test('clearing history wins against an earlier pending disk read', () async {
    final preferences = DelayedSearchPreferences();
    final container = ProviderContainer(overrides: [preferencesStoreProvider.overrideWithValue(preferences)]);
    addTearDown(container.dispose);
    container.read(recentSearchesProvider);
    await preferences.started.future;
    await container.read(recentSearchesProvider.notifier).clear();
    preferences.result.complete(['old private search']);
    await Future<void>.delayed(Duration.zero);
    expect(container.read(recentSearchesProvider), isEmpty);
  });

  test('a pending history read cannot update a disposed provider', () async {
    final errors = <Object>[];
    final finished = Completer<void>();
    runZonedGuarded(() async {
      final preferences = DelayedSearchPreferences();
      final container = ProviderContainer(overrides: [preferencesStoreProvider.overrideWithValue(preferences)]);
      container.read(recentSearchesProvider);
      await preferences.started.future;
      container.dispose();
      preferences.result.complete(['old private search']);
      await Future<void>.delayed(Duration.zero);
      finished.complete();
    }, (error, stack) => errors.add(error));
    await finished.future;
    expect(errors, isEmpty);
  });
}
