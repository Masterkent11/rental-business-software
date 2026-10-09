import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/messaging_repository.dart';
import '../../design/components.dart';
import '../../design/tokens.dart';

class ConversationScreen extends ConsumerStatefulWidget {
  const ConversationScreen({required this.conversationId, super.key});

  final String conversationId;

  @override
  ConsumerState<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends ConsumerState<ConversationScreen> with WidgetsBindingObserver {
  final _composer = TextEditingController();
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _scroll.addListener(() {
      if (_scroll.hasClients && _scroll.position.pixels >= _scroll.position.maxScrollExtent - 80) {
        ref.read(threadProvider(widget.conversationId).notifier).loadOlder();
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(threadProvider(widget.conversationId).notifier).resync();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _composer.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _send() {
    final text = _composer.text;
    if (text.trim().isEmpty) return;
    _composer.clear();
    ref.read(threadProvider(widget.conversationId).notifier).send(text);
    if (_scroll.hasClients) {
      _scroll.animateTo(0, duration: Tokens.medium, curve: Tokens.ease);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final thread = ref.watch(threadProvider(widget.conversationId));
    final conversation = thread.valueOrNull?.conversation;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: conversation == null
            ? const Text('Conversation')
            : Column(
                children: [
                  Text(conversation.partnerName, style: theme.textTheme.titleLarge),
                  Text(conversation.listingTitle,
                      style: theme.textTheme.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
        actions: [
          if (conversation != null)
            IconButton(
              tooltip: 'View place',
              icon: const Icon(Icons.home_outlined),
              onPressed: () => context.push(Routes.listing(conversation.listingId)),
            ),
        ],
      ),
      body: switch (thread) {
        AsyncError(:final error) => ErrorState(
            message: error is ApiException ? error.message : 'We could not open this conversation.',
            onRetry: () => ref.invalidate(threadProvider(widget.conversationId)),
          ),
        AsyncData(:final value) => Column(
            children: [
              if (value.conversation.bookingStartsOn != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter, vertical: Tokens.s8),
                  color: Tokens.softBlue,
                  child: Text(
                    'About your stay from ${DateFormat.MMMd().format(DateTime.parse(value.conversation.bookingStartsOn!))}',
                    style: theme.textTheme.bodySmall?.copyWith(color: Tokens.accent, fontWeight: FontWeight.w600),
                  ),
                ),
              Expanded(
                child: value.messages.isEmpty
                    ? const EmptyState(
                        icon: Icons.waving_hand_outlined,
                        title: 'Start the conversation',
                        message:
                            'Ask about availability, the neighbourhood, or anything else. Owners usually reply within the day.',
                      )
                    : ListView.builder(
                        controller: _scroll,
                        reverse: true,
                        padding: const EdgeInsets.fromLTRB(Tokens.s16, Tokens.s16, Tokens.s16, Tokens.s8),
                        itemCount: value.messages.length + (value.loadingOlder ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index == value.messages.length) {
                            return const Padding(
                              padding: EdgeInsets.all(Tokens.s16),
                              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                            );
                          }
                          final message = value.messages[value.messages.length - 1 - index];
                          final previous = index + 1 < value.messages.length
                              ? value.messages[value.messages.length - 2 - index]
                              : null;
                          final showDay = previous == null ||
                              DateUtils.dateOnly(previous.createdAt.toLocal()) !=
                                  DateUtils.dateOnly(message.createdAt.toLocal());
                          return Column(
                            children: [
                              if (showDay)
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: Tokens.s12),
                                  child: Text(
                                    DateFormat.MMMEd().format(message.createdAt.toLocal()),
                                    style: theme.textTheme.labelSmall,
                                  ),
                                ),
                              _Bubble(
                                message: message,
                                onRetry: () =>
                                    ref.read(threadProvider(widget.conversationId).notifier).retry(message.clientId),
                              ),
                            ],
                          );
                        },
                      ),
              ),
              _Composer(controller: _composer, onSend: _send),
            ],
          ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.onRetry});

  final MessageView message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mine = message.mine;
    final failed = message.delivery == Delivery.failed;
    final bubbleColor = failed
        ? Tokens.taken.withValues(alpha: 0.1)
        : mine
            ? Tokens.primaryNavy
            : theme.colorScheme.onSurface.withValues(alpha: 0.06);
    final textColor = failed
        ? Tokens.taken
        : mine
            ? Colors.white
            : theme.colorScheme.onSurface;

    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(bottom: Tokens.s6),
        child: Column(
          crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            ConstrainedBox(
              constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.76),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: bubbleColor,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(18),
                    topRight: const Radius.circular(18),
                    bottomLeft: Radius.circular(mine ? 18 : 6),
                    bottomRight: Radius.circular(mine ? 6 : 18),
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Text(message.body, style: theme.textTheme.bodyLarge?.copyWith(color: textColor)),
                ),
              ),
            ),
            const SizedBox(height: 3),
            switch (message.delivery) {
              Delivery.sending => Text('Sending…', style: theme.textTheme.labelSmall),
              Delivery.failed => InkWell(
                  onTap: onRetry,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Text(
                      'Not sent · Tap to retry',
                      style: theme.textTheme.labelSmall?.copyWith(color: Tokens.taken),
                    ),
                  ),
                ),
              Delivery.sent => Text(
                  DateFormat.jm().format(message.createdAt.toLocal()),
                  style: theme.textTheme.labelSmall,
                ),
            },
          ],
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({required this.controller, required this.onSend});

  final TextEditingController controller;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(Tokens.s12, Tokens.s8, Tokens.s8, Tokens.s8),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          border: Border(top: BorderSide(color: theme.colorScheme.outlineVariant)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 5,
                maxLength: 4000,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  hintText: 'Write a message',
                  counterText: '',
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
            ),
            const SizedBox(width: Tokens.s8),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: controller,
              builder: (context, value, _) => IconButton.filled(
                tooltip: 'Send',
                onPressed: value.text.trim().isEmpty ? null : onSend,
                style: IconButton.styleFrom(
                  backgroundColor: Tokens.primaryNavy,
                  minimumSize: const Size(46, 46),
                ),
                icon: const Icon(Icons.arrow_upward_rounded, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
