import 'package:flutter/material.dart';

import '../../../../core/design/tokens.dart';

class MessagesScreen extends StatelessWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: Padding(
        padding: const EdgeInsets.all(Tokens.gutter),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: Tokens.surfaceMuted,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.chat_bubble_outline, size: 28, color: Tokens.inkMuted),
            ),
            const SizedBox(height: Tokens.s16),
            Text(
              'No active conversations',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: Tokens.s8),
            Text(
              'When you inquire about a listing or receive updates from property owners, your chat threads will appear here.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(color: Tokens.inkMuted),
            ),
          ],
        ),
      ),
    );
  }
}
