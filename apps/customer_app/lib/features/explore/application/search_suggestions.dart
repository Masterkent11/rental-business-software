import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/discovery_repository.dart';
import '../../../data/preferences_store.dart';
import '../domain/listing_category.dart';

const Duration kSuggestionDebounce = Duration(milliseconds: 300);
const int kMinSuggestionLength = 2;
const int kMaxRecentSearches = 8;
const String kRecentSearchesKey = 'discovery.recent_searches';

typedef SuggestionRequest = ({String text, MarketIntent intent});

final searchSuggestionsProvider =
    FutureProvider.autoDispose.family<SearchSuggestions, SuggestionRequest>((ref, request) async {
  final trimmed = request.text.trim();
  if (trimmed.length < kMinSuggestionLength) return SearchSuggestions.empty;
  var disposed = false;
  ref.onDispose(() => disposed = true);
  await Future<void>.delayed(kSuggestionDebounce);
  if (disposed) return SearchSuggestions.empty;
  return ref.read(discoveryRepositoryProvider).suggestions(trimmed, intent: request.intent);
});

class RecentSearches extends Notifier<List<String>> {
  @override
  List<String> build() {
    Future.microtask(() async {
      final stored = await ref.read(preferencesStoreProvider).readList(kRecentSearchesKey);
      if (state.isEmpty && stored.isNotEmpty) state = stored;
    });
    return const [];
  }

  Future<void> add(String text) async {
    final value = text.trim();
    if (value.length < kMinSuggestionLength) return;
    state = [value, ...state.where((s) => s.toLowerCase() != value.toLowerCase())].take(kMaxRecentSearches).toList();
    await ref.read(preferencesStoreProvider).writeList(kRecentSearchesKey, state);
  }

  Future<void> clear() async {
    state = const [];
    await ref.read(preferencesStoreProvider).remove(kRecentSearchesKey);
  }
}

final recentSearchesProvider = NotifierProvider<RecentSearches, List<String>>(RecentSearches.new);
