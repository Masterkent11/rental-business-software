import 'package:flutter/material.dart';

import '../../../../core/design/tokens.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
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
              child: const Icon(Icons.notifications_none_outlined, size: 28, color: Tokens.inkMuted),
            ),
            const SizedBox(height: Tokens.s16),
            Text(
              'All caught up',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: Tokens.s8),
            Text(
              'Important updates about your bookings, payment receipts, and application approvals will show here.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(color: Tokens.inkMuted),
            ),
          ],
        ),
      ),
    );
  }
}
