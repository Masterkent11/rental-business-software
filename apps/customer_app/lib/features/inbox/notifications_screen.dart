import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/auth_repository.dart';
import '../../data/notification_repository.dart';
import '../../design/components.dart';
import '../../design/tokens.dart';
import 'messages_screen.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !ref.read(isSignedInProvider)) return;
      ref.read(notificationsProvider.future).then(
            (_) => ref.read(notificationsProvider.notifier).markAllRead(),
            onError: (Object _) {},
          );
    });
  }

  IconData _icon(String kind) => switch (kind) {
        'BOOKING_CONFIRMED' || 'BOOKING_UPDATED' => Icons.event_available_outlined,
        'MESSAGE_RECEIVED' => Icons.chat_bubble_outline,
        'APPLICATION_DECIDED' => Icons.description_outlined,
        _ => Icons.notifications_none,
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final signedIn = ref.watch(isSignedInProvider);
    final notifications = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: !signedIn
          ? EmptyState(
              icon: Icons.notifications_none,
              title: 'Stay in the loop',
              message: 'Sign in to get booking confirmations and owner replies here.',
              actionLabel: 'Sign in',
              onAction: () => context.push(Routes.auth(from: Routes.notifications)),
            )
          : switch (notifications) {
              AsyncError(:final error) => ErrorState(
                  message: error is ApiException ? error.message : 'We could not load notifications.',
                  onRetry: () => ref.invalidate(notificationsProvider),
                ),
              AsyncData(:final value) when value.isEmpty => const EmptyState(
                  icon: Icons.notifications_none,
                  title: 'You’re all caught up',
                  message: 'Booking updates and owner replies will appear here.',
                ),
              AsyncData(:final value) => ListView.separated(
                  physics: Tokens.scroll,
                  itemCount: value.length,
                  separatorBuilder: (_, __) => Divider(height: 1, indent: 72, color: theme.colorScheme.outlineVariant),
                  itemBuilder: (context, i) {
                    final n = value[i];
                    final link = n.link;
                    return InkWell(
                      onTap: link == null ? null : () => context.push(link),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter, vertical: Tokens.s16),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: theme.colorScheme.onSurface.withValues(alpha: 0.05),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(_icon(n.kind), size: 20),
                            ),
                            const SizedBox(width: Tokens.s16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(n.title, style: theme.textTheme.titleMedium),
                                  const SizedBox(height: 2),
                                  Text(n.body,
                                      style: theme.textTheme.bodyMedium
                                          ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
                                  const SizedBox(height: 4),
                                  Text(conversationTime(n.createdAt), style: theme.textTheme.bodySmall),
                                ],
                              ),
                            ),
                            if (!n.read)
                              Container(
                                margin: const EdgeInsets.only(top: 6),
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(color: Tokens.accent, shape: BoxShape.circle),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              _ => const Center(child: CircularProgressIndicator()),
            },
    );
  }
}
