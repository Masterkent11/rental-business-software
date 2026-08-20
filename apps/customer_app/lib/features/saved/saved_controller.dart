import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Saved listings, in memory only.
///
/// Favourites belong to a User in the domain, and this app has no account yet —
/// so they live for the length of the session and no longer. That is honest,
/// and it is deliberately not disguised with local persistence that would have
/// to be reconciled with the server later.
final savedIdsProvider =
    NotifierProvider<SavedIds, Set<String>>(SavedIds.new);

class SavedIds extends Notifier<Set<String>> {
  @override
  Set<String> build() => {'lst-unit-203'};

  void toggle(String id) {
    final next = {...state};
    if (!next.remove(id)) next.add(id);
    state = next;
  }

  bool contains(String id) => state.contains(id);
}
