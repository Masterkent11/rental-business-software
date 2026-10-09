import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/messaging_repository.dart';
import '../../design/components.dart';

class StartConversationScreen extends ConsumerStatefulWidget {
  const StartConversationScreen({required this.listingId, this.bookingId, super.key});

  final String listingId;
  final String? bookingId;

  @override
  ConsumerState<StartConversationScreen> createState() => _StartConversationScreenState();
}

class _StartConversationScreenState extends ConsumerState<StartConversationScreen> {
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _open());
  }

  Future<void> _open() async {
    setState(() => _error = null);
    try {
      final conversation =
          await ref.read(messagingRepositoryProvider).open(listingId: widget.listingId, bookingId: widget.bookingId);
      if (!mounted) return;
      ref.read(inboxProvider.notifier).refreshQuietly();
      context.pushReplacement(Routes.conversation(conversation.id));
    } catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final error = _error;
    return Scaffold(
      appBar: AppBar(title: const Text('Message owner')),
      body: error == null
          ? const Center(child: CircularProgressIndicator())
          : ErrorState(
              message: error is ApiException ? error.message : 'We could not open a conversation right now.',
              onRetry: _open,
            ),
    );
  }
}
