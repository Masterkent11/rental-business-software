import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;

import '../app/bootstrap/app_bootstrap.dart';
import 'api_client.dart';
import 'auth_repository.dart';
import 'ids.dart';
import 'listing_repository.dart';

enum SenderRole { customer, owner }

enum Delivery { sent, sending, failed }

@immutable
class MessageView {
  const MessageView({
    required this.id,
    required this.conversationId,
    required this.senderRole,
    required this.body,
    required this.clientId,
    required this.createdAt,
    this.delivery = Delivery.sent,
  });

  final String id;
  final String conversationId;
  final SenderRole senderRole;
  final String body;
  final String clientId;
  final DateTime createdAt;
  final Delivery delivery;

  bool get mine => senderRole == SenderRole.customer;

  MessageView withDelivery(Delivery next) => MessageView(
        id: id,
        conversationId: conversationId,
        senderRole: senderRole,
        body: body,
        clientId: clientId,
        createdAt: createdAt,
        delivery: next,
      );

  static MessageView fromJson(Map<String, dynamic> json) => MessageView(
        id: json['id'] as String,
        conversationId: (json['conversationId'] ?? json['conversation_id']) as String,
        senderRole: ((json['senderRole'] ?? json['sender_role']) as String) == 'OWNER'
            ? SenderRole.owner
            : SenderRole.customer,
        body: json['body'] as String? ?? '',
        clientId: (json['clientId'] ?? json['client_id']) as String,
        createdAt: DateTime.parse((json['createdAt'] ?? json['created_at']) as String).toUtc(),
      );
}

@immutable
class ConversationView {
  const ConversationView({
    required this.id,
    required this.listingId,
    required this.listingTitle,
    required this.listingPhoto,
    required this.organizationName,
    required this.bookingId,
    required this.bookingStartsOn,
    required this.lastMessageAt,
    required this.lastMessagePreview,
    required this.lastSenderRole,
    required this.unreadCount,
  });

  final String id;
  final String listingId;
  final String listingTitle;
  final String? listingPhoto;
  final String organizationName;
  final String? bookingId;
  final String? bookingStartsOn;
  final DateTime? lastMessageAt;
  final String lastMessagePreview;
  final SenderRole? lastSenderRole;
  final int unreadCount;

  static ConversationView fromJson(Map<String, dynamic> json) => ConversationView(
        id: json['id'] as String,
        listingId: json['listingId'] as String,
        listingTitle: json['listingTitle'] as String? ?? '',
        listingPhoto: json['listingPhoto'] as String?,
        organizationName: json['organizationName'] as String? ?? 'Owner',
        bookingId: json['bookingId'] as String?,
        bookingStartsOn: json['bookingStartsOn'] as String?,
        lastMessageAt:
            json['lastMessageAt'] == null ? null : DateTime.parse(json['lastMessageAt'] as String),
        lastMessagePreview: json['lastMessagePreview'] as String? ?? '',
        lastSenderRole: switch (json['lastSenderRole']) {
          'OWNER' => SenderRole.owner,
          'CUSTOMER' => SenderRole.customer,
          _ => null,
        },
        unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
      );
}

class ThreadPage {
  const ThreadPage({required this.conversation, required this.messages, required this.hasMore});

  final ConversationView conversation;
  final List<MessageView> messages;
  final bool hasMore;
}

List<MessageView> mergeMessages(List<MessageView> current, Iterable<MessageView> incoming) {
  final byClient = <String, MessageView>{for (final m in current) m.clientId: m};
  for (final message in incoming) {
    byClient[message.clientId] = message.withDelivery(Delivery.sent);
  }
  final merged = byClient.values.toList()
    ..sort((a, b) {
      final byTime = a.createdAt.compareTo(b.createdAt);
      return byTime != 0 ? byTime : a.id.compareTo(b.id);
    });
  return merged;
}

class MessagingRepository {
  MessagingRepository(this._api);

  final ApiClient _api;

  Future<ConversationView> open({required String listingId, String? bookingId}) async {
    final json = await _api.sendJson(
      'POST',
      '/conversations',
      body: {'listingId': listingId, 'bookingId': bookingId},
    );
    return ConversationView.fromJson(json);
  }

  Future<({List<ConversationView> conversations, int unreadTotal})> mine() async {
    final json = await _api.getJson('/me/conversations');
    return (
      conversations: (json['conversations'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(ConversationView.fromJson)
          .toList(growable: false),
      unreadTotal: (json['unreadTotal'] as num?)?.toInt() ?? 0,
    );
  }

  Future<ThreadPage> thread(String conversationId, {DateTime? before}) async {
    final json = await _api.getJson(
      '/conversations/$conversationId/messages',
      query: {'limit': '50', 'before': before?.toUtc().toIso8601String()},
    );
    return ThreadPage(
      conversation: ConversationView.fromJson(json['conversation'] as Map<String, dynamic>),
      messages: (json['messages'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(MessageView.fromJson)
          .toList(growable: false),
      hasMore: json['hasMore'] as bool? ?? false,
    );
  }

  Future<MessageView> send(String conversationId, String body, String clientId) async {
    final json = await _api.sendJson(
      'POST',
      '/conversations/$conversationId/messages',
      body: {'body': body, 'clientId': clientId},
    );
    return MessageView.fromJson(json);
  }

  Future<void> markRead(String conversationId) async {
    await _api.sendJson('POST', '/conversations/$conversationId/read');
  }
}

abstract interface class RealtimeGateway {
  Stream<MessageView> messagesFor(String conversationId);
  Stream<void> conversationChangesFor(String customerId);
  Stream<Map<String, dynamic>> notificationsFor(String userId);
}

class SupabaseRealtimeGateway implements RealtimeGateway {
  SupabaseRealtimeGateway(this._client);

  final supabase.SupabaseClient _client;

  Stream<Map<String, dynamic>> _watch({
    required String channelName,
    required String table,
    required supabase.PostgresChangeEvent event,
    required String column,
    required String value,
  }) {
    late final StreamController<Map<String, dynamic>> controller;
    supabase.RealtimeChannel? channel;
    controller = StreamController<Map<String, dynamic>>(
      onListen: () {
        final session = _client.auth.currentSession;
        if (session != null) _client.realtime.setAuth(session.accessToken);
        channel = _client
            .channel('$channelName:${newUuid()}')
            .onPostgresChanges(
              event: event,
              schema: 'public',
              table: table,
              filter: supabase.PostgresChangeFilter(
                type: supabase.PostgresChangeFilterType.eq,
                column: column,
                value: value,
              ),
              callback: (payload) {
                if (!controller.isClosed) controller.add(payload.newRecord);
              },
            )
            .subscribe();
      },
      onCancel: () async {
        final active = channel;
        channel = null;
        if (active != null) await _client.removeChannel(active);
      },
    );
    return controller.stream;
  }

  @override
  Stream<MessageView> messagesFor(String conversationId) => _watch(
        channelName: 'conversation',
        table: 'messages',
        event: supabase.PostgresChangeEvent.insert,
        column: 'conversation_id',
        value: conversationId,
      ).map(MessageView.fromJson);

  @override
  Stream<void> conversationChangesFor(String customerId) => _watch(
        channelName: 'my-conversations',
        table: 'conversations',
        event: supabase.PostgresChangeEvent.all,
        column: 'customer_id',
        value: customerId,
      ).map((_) {});

  @override
  Stream<Map<String, dynamic>> notificationsFor(String userId) => _watch(
        channelName: 'my-notifications',
        table: 'notifications',
        event: supabase.PostgresChangeEvent.insert,
        column: 'user_id',
        value: userId,
      );
}

class DisconnectedRealtimeGateway implements RealtimeGateway {
  const DisconnectedRealtimeGateway();

  @override
  Stream<MessageView> messagesFor(String conversationId) => const Stream.empty();

  @override
  Stream<void> conversationChangesFor(String customerId) => const Stream.empty();

  @override
  Stream<Map<String, dynamic>> notificationsFor(String userId) => const Stream.empty();
}

final messagingRepositoryProvider = Provider<MessagingRepository>(
  (ref) => MessagingRepository(ref.watch(apiClientProvider)),
);

final realtimeGatewayProvider = Provider<RealtimeGateway>((ref) {
  if (!ref.watch(appBootstrapStateProvider).isReady) return const DisconnectedRealtimeGateway();
  return SupabaseRealtimeGateway(supabase.Supabase.instance.client);
});

class InboxState {
  const InboxState({required this.conversations, required this.unreadTotal});

  final List<ConversationView> conversations;
  final int unreadTotal;
}

class InboxController extends AsyncNotifier<InboxState> {
  StreamSubscription<void>? _subscription;

  @override
  Future<InboxState> build() async {
    ref.watch(sessionProvider);
    final userId = ref.watch(currentUserIdProvider);
    if (userId == null) return const InboxState(conversations: [], unreadTotal: 0);
    _subscription?.cancel();
    _subscription = ref
        .watch(realtimeGatewayProvider)
        .conversationChangesFor(userId)
        .listen((_) => refreshQuietly());
    ref.onDispose(() => _subscription?.cancel());
    final result = await ref.watch(messagingRepositoryProvider).mine();
    return InboxState(conversations: result.conversations, unreadTotal: result.unreadTotal);
  }

  Future<void> refreshQuietly() async {
    if (ref.read(currentUserIdProvider) == null) return;
    try {
      final result = await ref.read(messagingRepositoryProvider).mine();
      state = AsyncData(InboxState(conversations: result.conversations, unreadTotal: result.unreadTotal));
    } on ApiException {
      return;
    }
  }
}

final inboxProvider = AsyncNotifierProvider<InboxController, InboxState>(InboxController.new);

class ThreadState {
  const ThreadState({
    required this.conversation,
    required this.messages,
    required this.hasMore,
    this.loadingOlder = false,
  });

  final ConversationView conversation;
  final List<MessageView> messages;
  final bool hasMore;
  final bool loadingOlder;

  ThreadState copyWith({
    ConversationView? conversation,
    List<MessageView>? messages,
    bool? hasMore,
    bool? loadingOlder,
  }) =>
      ThreadState(
        conversation: conversation ?? this.conversation,
        messages: messages ?? this.messages,
        hasMore: hasMore ?? this.hasMore,
        loadingOlder: loadingOlder ?? this.loadingOlder,
      );
}

class ThreadController extends AutoDisposeFamilyAsyncNotifier<ThreadState, String> {
  StreamSubscription<MessageView>? _live;

  @override
  Future<ThreadState> build(String conversationId) async {
    _live = ref.watch(realtimeGatewayProvider).messagesFor(conversationId).listen(_receive);
    ref.onDispose(() => _live?.cancel());
    final page = await ref.watch(messagingRepositoryProvider).thread(conversationId);
    _markRead();
    return ThreadState(conversation: page.conversation, messages: page.messages, hasMore: page.hasMore);
  }

  void _receive(MessageView message) {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncData(current.copyWith(messages: mergeMessages(current.messages, [message])));
    if (message.senderRole == SenderRole.owner) _markRead();
  }

  void _markRead() {
    ref.read(messagingRepositoryProvider).markRead(arg).then(
          (_) => ref.read(inboxProvider.notifier).refreshQuietly(),
          onError: (Object _) {},
        );
  }

  Future<void> resync() async {
    final current = state.valueOrNull;
    if (current == null) return;
    try {
      final page = await ref.read(messagingRepositoryProvider).thread(arg);
      state = AsyncData(current.copyWith(messages: mergeMessages(current.messages, page.messages)));
    } on ApiException {
      return;
    }
  }

  Future<void> loadOlder() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.loadingOlder || current.messages.isEmpty) return;
    state = AsyncData(current.copyWith(loadingOlder: true));
    try {
      final page = await ref
          .read(messagingRepositoryProvider)
          .thread(arg, before: current.messages.first.createdAt);
      state = AsyncData(current.copyWith(
        messages: mergeMessages(current.messages, page.messages),
        hasMore: page.hasMore,
        loadingOlder: false,
      ));
    } on ApiException {
      state = AsyncData(current.copyWith(loadingOlder: false));
    }
  }

  Future<void> send(String text) async {
    final body = text.trim();
    final current = state.valueOrNull;
    if (body.isEmpty || current == null) return;
    final clientId = newUuid();
    final optimistic = MessageView(
      id: 'local-$clientId',
      conversationId: arg,
      senderRole: SenderRole.customer,
      body: body,
      clientId: clientId,
      createdAt: DateTime.now().toUtc(),
      delivery: Delivery.sending,
    );
    state = AsyncData(current.copyWith(messages: [...current.messages, optimistic]));
    await _deliver(optimistic);
  }

  Future<void> retry(String clientId) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final failed = current.messages.where((m) => m.clientId == clientId).firstOrNull;
    if (failed == null) return;
    state = AsyncData(current.copyWith(
      messages: [for (final m in current.messages) m.clientId == clientId ? m.withDelivery(Delivery.sending) : m],
    ));
    await _deliver(failed);
  }

  Future<void> _deliver(MessageView message) async {
    try {
      final saved = await ref.read(messagingRepositoryProvider).send(arg, message.body, message.clientId);
      _receive(saved);
      ref.read(inboxProvider.notifier).refreshQuietly();
    } catch (_) {
      final current = state.valueOrNull;
      if (current == null) return;
      state = AsyncData(current.copyWith(
        messages: [
          for (final m in current.messages) m.clientId == message.clientId ? m.withDelivery(Delivery.failed) : m,
        ],
      ));
    }
  }
}

final threadProvider =
    AsyncNotifierProvider.autoDispose.family<ThreadController, ThreadState, String>(ThreadController.new);
