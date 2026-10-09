import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/listing_repository.dart';
import '../../../fixtures/view_models.dart';
import '../../location/location_controller.dart';
import '../domain/explore_query.dart';
import 'explore_controller.dart';

@immutable
class ExploreResultsState {
  const ExploreResultsState({
    required this.items,
    required this.total,
    required this.hasMore,
    this.loadingMore = false,
    this.loadMoreError,
  });

  final List<ListingCardView> items;
  final int total;
  final bool hasMore;
  final bool loadingMore;
  final Object? loadMoreError;

  ExploreResultsState copyWith({
    List<ListingCardView>? items,
    int? total,
    bool? hasMore,
    bool? loadingMore,
    Object? loadMoreError,
    bool clearError = false,
  }) =>
      ExploreResultsState(
        items: items ?? this.items,
        total: total ?? this.total,
        hasMore: hasMore ?? this.hasMore,
        loadingMore: loadingMore ?? this.loadingMore,
        loadMoreError: clearError ? null : (loadMoreError ?? this.loadMoreError),
      );
}

class ExploreResults extends AutoDisposeFamilyAsyncNotifier<ExploreResultsState, ExploreQuery> {
  int _generation = 0;

  @override
  Future<ExploreResultsState> build(ExploreQuery seed) {
    ref
      ..listen(exploreQueryProvider(seed), (_, __) => _generation++)
      ..listen(locationProvider.select((s) => s.place), (_, __) => _generation++);
    final query = ref.watch(exploreQueryProvider(seed));
    final place = ref.watch(locationProvider.select((s) => s.place));
    final first = Completer<ExploreResultsState>();
    final subscription = ref.watch(listingRepositoryProvider).watchSearch(query, place: place).listen(
      (page) {
        final next = ExploreResultsState(items: page.items, total: page.total, hasMore: page.hasMore);
        if (!first.isCompleted) {
          first.complete(next);
          return;
        }
        final current = state.valueOrNull;
        if (current == null || current.items.length <= page.items.length) state = AsyncData(next);
      },
      onError: (Object error, StackTrace stackTrace) {
        if (!first.isCompleted) first.completeError(error, stackTrace);
      },
    );
    ref.onDispose(() {
      _generation++;
      subscription.cancel();
    });
    return first.future;
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future.then((_) {}, onError: (_) {});
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.loadingMore || state.isLoading) return;
    final generation = _generation;
    final query = ref.read(exploreQueryProvider(arg));
    final place = ref.read(locationProvider).place;
    final repository = ref.read(listingRepositoryProvider);
    state = AsyncData(current.copyWith(loadingMore: true, clearError: true));
    try {
      final page = await repository.search(query, place: place, offset: current.items.length);
      if (generation != _generation) return;
      final seen = current.items.map((l) => l.id).toSet();
      state = AsyncData(
        current.copyWith(
          items: [...current.items, ...page.items.where((l) => !seen.contains(l.id))],
          total: page.total,
          hasMore: page.hasMore,
          loadingMore: false,
        ),
      );
    } catch (error) {
      if (generation != _generation) return;
      state = AsyncData(current.copyWith(loadingMore: false, loadMoreError: error));
    }
  }
}

final exploreResultsProvider =
    AsyncNotifierProvider.autoDispose.family<ExploreResults, ExploreResultsState, ExploreQuery>(ExploreResults.new);

final exploreMatchCountProvider = FutureProvider.autoDispose.family<int, ExploreQuery>((ref, query) async {
  final place = ref.watch(locationProvider.select((s) => s.place));
  final page = await ref.watch(listingRepositoryProvider).search(query, place: place, limit: 1);
  return page.total;
});
