import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/account_repository.dart';
import '../../data/api_client.dart';
import '../../data/auth_repository.dart';

/// Saved listings, belonging to the account.
///
/// They used to live in memory for the length of a session, which was honest
/// while there was no account. Now they follow the person: sign in on one
/// device and they are there on another, because the server holds them.
///
/// Signed out, the set is empty rather than local — a local list would have to
/// be reconciled with the server on sign-in, and quietly merging two lists is
/// how a customer loses a favourite without being told.
final savedIdsProvider =
    AsyncNotifierProvider<SavedIds, Set<String>>(SavedIds.new);

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

  /// Save or unsave, showing the change immediately and correcting itself if
  /// the server disagrees.
  ///
  /// The optimistic update is deliberate: a heart tap that waits on a round
  /// trip over Philippine mobile data feels broken. The rollback matters just
  /// as much — a favourite that appears saved but was not is worse than one
  /// that visibly failed.
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

/// Whether one listing is saved, for a heart icon that must not care about
/// loading states.
final isSavedProvider = Provider.family<bool, String>(
  (ref, id) => ref.watch(savedIdsProvider).valueOrNull?.contains(id) ?? false,
);
