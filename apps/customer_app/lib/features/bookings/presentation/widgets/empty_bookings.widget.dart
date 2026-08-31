import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/design/tokens.dart';

class EmptyBookings extends StatelessWidget {
  const EmptyBookings({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.all(Tokens.gutter),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(
              color: Tokens.surfaceMuted,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.hotel_outlined, size: 28, color: Tokens.inkMuted),
          ),
          const SizedBox(height: Tokens.s16),
          Text(
            'No stays booked yet',
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: Tokens.s8),
          Text(
            'When you book short stays, your trip details, receipts, and host messages will appear here.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(color: Tokens.inkMuted),
          ),
          const SizedBox(height: Tokens.s20),
          FilledButton(
            onPressed: () => context.go('/'),
            child: const Text('Find a place to stay'),
          ),
        ],
      ),
    );
  }
}
