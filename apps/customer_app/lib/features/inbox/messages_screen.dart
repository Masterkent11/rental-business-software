import 'package:flutter/material.dart';

import '../../design/tokens.dart';

class MessagesScreen extends StatelessWidget {
  const MessagesScreen({super.key});

  static const _threads = [
    (
      'Santos Property Holdings',
      'Unit 203, ABC Apartment',
      'Yes, the aircon in the bedroom is inverter. Water is separate, '
          'usually ₱300–400 a month.',
      '1h ago',
      true,
    ),
    (
      'Skyline Property Management',
      'Condo stay · Dec 26–29',
      'Check-in is 2 PM. I will send the gate code the day before.',
      'Yesterday',
      true,
    ),
    (
      'Villa Rentals',
      'Bed space near USC',
      'The lower bunk is still open. Would you like to see it in person?',
      '4 days ago',
      false,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.separated(
              physics: Tokens.scroll,
              padding: const EdgeInsets.symmetric(vertical: Tokens.s8),
              itemCount: _threads.length,
              separatorBuilder: (_, __) => Divider(
                height: 1,
                indent: Tokens.gutter,
                color: theme.colorScheme.outlineVariant,
              ),
              itemBuilder: (context, i) {
                final (org, about, preview, ago, unread) = _threads[i];
                return Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: Tokens.gutter,
                    vertical: Tokens.s16,
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: theme.colorScheme.primary.withOpacity(0.07),
                        ),
                        child: Text(
                          org.split(' ').take(2).map((w) => w[0]).join(),
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: theme.colorScheme.primary,
                          ),
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
                                    org,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: theme.textTheme.titleMedium,
                                  ),
                                ),
                                const SizedBox(width: Tokens.s8),
                                Text(ago, style: theme.textTheme.labelSmall),
                              ],
                            ),
                            const SizedBox(height: 1),
                            Text(
                              about,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: Tokens.accent,
                              ),
                            ),
                            const SizedBox(height: Tokens.s4),
                            Text(
                              preview,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodySmall?.copyWith(
                                fontWeight: unread
                                    ? FontWeight.w600
                                    : FontWeight.w400,
                                color: unread
                                    ? theme.colorScheme.onSurface
                                    : theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(Tokens.gutter),
              child: Text(
                'Messages here are about a listing, an application, or a '
                'booking. This is not a general chat.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
