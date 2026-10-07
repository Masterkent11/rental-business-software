import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'auth_repository.dart';
import 'listing_repository.dart';
import 'messaging_repository.dart';

@immutable
class NotificationView {
  const NotificationView({
    required this.id,
    required this.kind,
    required this.title,
    required this.body,
    required this.link,
    required this.read,
    required this.createdAt,
  });

  final String id;
  final String kind;
  final String title;
  final String body;
  final String? link;
  final bool read;
  final DateTime createdAt;

  static NotificationView fromJson(Map<String, dynamic> json) => NotificationView(
        id: json['id'] as String,
        kind: json['kind'] as String? ?? '',
        title: json['title'] as String? ?? '',
        body: json['body'] as String? ?? '',
        link: json['link'] as String?,
        read: (json['readAt'] ?? json['read_at']) != null,
        createdAt: DateTime.parse((json['createdAt'] ?? json['created_at']) as String),
      );
}

class NotificationRepository {
  NotificationRepository(this._api);

  final ApiClient _api;

  Future<List<NotificationView>> mine() async {
    final json = await _api.getJson('/me/notifications');
    return (json['notifications'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(NotificationView.fromJson)
        .toList(growable: false);
  }

  Future<void> markAllRead() async {
    await _api.sendJson('POST', '/me/notifications/read', body: {'all': true});
  }
}

final notificationRepositoryProvider = Provider<NotificationRepository>(
  (ref) => NotificationRepository(ref.watch(apiClientProvider)),
);

class NotificationsController extends AsyncNotifier<List<NotificationView>> {
  StreamSubscription<Map<String, dynamic>>? _live;

  @override
  Future<List<NotificationView>> build() async {
    ref.watch(sessionProvider);
    final userId = ref.watch(currentUserIdProvider);
    if (userId == null) return const [];
    _live?.cancel();
    _live = ref.watch(realtimeGatewayProvider).notificationsFor(userId).listen((row) {
      final current = state.valueOrNull ?? const <NotificationView>[];
      final next = NotificationView.fromJson(row);
      if (current.any((n) => n.id == next.id)) return;
      state = AsyncData([next, ...current]);
    });
    ref.onDispose(() => _live?.cancel());
    return ref.watch(notificationRepositoryProvider).mine();
  }

  Future<void> markAllRead() async {
    final current = state.valueOrNull ?? const <NotificationView>[];
    if (current.every((n) => n.read)) return;
    state = AsyncData([
      for (final n in current)
        NotificationView(
          id: n.id,
          kind: n.kind,
          title: n.title,
          body: n.body,
          link: n.link,
          read: true,
          createdAt: n.createdAt,
        ),
    ]);
    await ref.read(notificationRepositoryProvider).markAllRead();
  }
}

final notificationsProvider =
    AsyncNotifierProvider<NotificationsController, List<NotificationView>>(NotificationsController.new);

final unreadNotificationsProvider = Provider<int>(
  (ref) => ref.watch(notificationsProvider).valueOrNull?.where((n) => !n.read).length ?? 0,
);
