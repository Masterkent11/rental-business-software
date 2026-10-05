import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/account_repository.dart';
import '../../data/api_client.dart';
import '../../data/auth_repository.dart';

final savedIdsProvider = AsyncNotifierProvider<SavedIds, Set<String>>(
  SavedIds.new,
);

class SavedIds extends AsyncNotifier<Set<String>> {
  @override
  Future<Set<String>> build() async {
    ref.watch(sessionProvider);
    if (ref.watch(authRepositoryProvider).accessToken == null) return {};

    try {
      final ids = await ref.watch(accountRepositoryProvider).savedListingIds();
      return ids.toSet();
    } on ApiException catch (error) {
      if (error.isUnauthorized) return {};
      rethrow;
    }
  }

  Future<void> toggle(String id) async {
    if (ref.read(authRepositoryProvider).accessToken == null) return;

    final current = state.valueOrNull ?? <String>{};
    final adding = !current.contains(id);
    final optimistic = {...current};
    adding ? optimistic.add(id) : optimistic.remove(id);
    state = AsyncData(optimistic);

    try {
      final repo = ref.read(accountRepositoryProvider);
      final ids = adding ? await repo.save(id) : await repo.unsave(id);
      state = AsyncData(ids.toSet());
    } on ApiException {
      state = AsyncData(current);
      rethrow;
    }
  }

  bool contains(String id) => state.valueOrNull?.contains(id) ?? false;
}

final isSavedProvider = Provider.family<bool, String>(
  (ref, id) => ref.watch(savedIdsProvider).valueOrNull?.contains(id) ?? false,
);
