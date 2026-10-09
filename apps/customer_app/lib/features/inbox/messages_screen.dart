import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/auth_repository.dart';
import '../../data/messaging_repository.dart';
import '../../design/app_image.dart';
import '../../design/components.dart';
import '../../design/tokens.dart';

String conversationTime(DateTime? at) {
  if (at == null) return '';
  final local = at.toLocal();
  final now = DateTime.now();
  if (now.difference(local).inHours < 24 && now.day == local.day) return DateFormat.jm().format(local);
  if (now.difference(local).inDays < 7) return DateFormat.E().format(local);
  return DateFormat.MMMd().format(local);
}

class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(isSignedInProvider);
    final inbox = ref.watch(inboxProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Messages'), automaticallyImplyLeading: context.canPop()),
      body: !signedIn
          ? EmptyState(
              icon: Icons.chat_bubble_outline,
              title: 'Talk to owners',
              message: 'Sign in to ask owners about a place or your booking. Replies arrive here instantly.',
              actionLabel: 'Sign in',
              onAction: () =>
                  context.push(Routes.auth(from: Routes.messages, reason: 'Sign in to see your conversations.')),
            )
          : switch (inbox) {
              AsyncError(:final error) => ErrorState(
                  message: error is ApiException ? error.message : 'We could not load your messages.',
                  onRetry: () => ref.invalidate(inboxProvider),
                ),
              AsyncData(:final value) when value.conversations.isEmpty => const EmptyState(
                  icon: Icons.forum_outlined,
                  title: 'No conversations yet',
                  message: 'Open any place and tap “Message owner” to ask a question before you book.',
                ),
              AsyncData(:final value) => RefreshIndicator(
                  onRefresh: () => ref.read(inboxProvider.notifier).refreshQuietly(),
                  child: ListView.separated(
                    physics: Tokens.scroll,
                    padding: const EdgeInsets.only(bottom: Tokens.s64),
                    itemCount: value.conversations.length,
                    separatorBuilder: (_, __) =>
                        Divider(height: 1, indent: 88, color: theme.colorScheme.outlineVariant),
                    itemBuilder: (context, i) {
                      final c = value.conversations[i];
                      final unread = c.unreadCount > 0;
                      return InkWell(
                        onTap: () => context.push(Routes.conversation(c.id)),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter, vertical: Tokens.s12),
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(Tokens.rSm),
                                child: SizedBox(
                                  width: 56,
                                  height: 56,
                                  child: c.listingPhoto == null
                                      ? Container(color: theme.colorScheme.outlineVariant)
                                      : AppImage(url: c.listingPhoto!, cacheWidth: 168),
                                ),
                              ),
                              const SizedBox(width: Tokens.s12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            c.partnerName,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: theme.textTheme.titleMedium?.copyWith(
                                              fontWeight: unread ? FontWeight.w700 : FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                        Text(conversationTime(c.lastMessageAt), style: theme.textTheme.bodySmall),
                                      ],
                                    ),
                                    Text(c.listingTitle,
                                        maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.bodySmall),
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            c.lastMessagePreview.isEmpty
                                                ? 'Say hello'
                                                : '${c.lastSenderRole == SenderRole.customer ? 'You: ' : ''}${c.lastMessagePreview}',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: theme.textTheme.bodyMedium?.copyWith(
                                              color: unread
                                                  ? theme.colorScheme.onSurface
                                                  : theme.colorScheme.onSurfaceVariant,
                                              fontWeight: unread ? FontWeight.w600 : FontWeight.w400,
                                            ),
                                          ),
                                        ),
                                        CountBadge(count: c.unreadCount),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              _ => ListView(
                  padding: const EdgeInsets.all(Tokens.gutter),
                  children: [
                    for (var i = 0; i < 5; i++)
                      const Padding(
                        padding: EdgeInsets.only(bottom: Tokens.s20),
                        child: Row(
                          children: [
                            SkeletonBox(width: 56, height: 56, radius: Tokens.rSm),
                            SizedBox(width: Tokens.s12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  SkeletonBox(width: 160),
                                  SizedBox(height: 8),
                                  SkeletonBox(width: 220, height: 12),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
            },
    );
  }
}
