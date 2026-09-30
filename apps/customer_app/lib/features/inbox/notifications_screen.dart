import 'package:flutter/material.dart';

import '../../design/tokens.dart';

/// Notifications.
///
/// The bar the tenant journey sets is that **a customer should never be chased
/// for something they were not told about** — so this is a log of things that
/// happened, each with the time it happened, not a marketing channel.
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  static const _items = [
    (
      Icons.check_circle_outline,
      'Your booking is confirmed',
      'Condo stay, Skyline Residences · Dec 26–29',
      '2h ago',
      true,
    ),
    (
      Icons.description_outlined,
      'Your application is under review',
      'Unit 203, ABC Apartment · submitted 18 Aug',
      'Yesterday',
      true,
    ),
    (
      Icons.threed_rotation,
      'A place you saved added a virtual tour',
      'Bed space near USC · 3 rooms to walk through',
      '2 days ago',
      true,
    ),
    (
      Icons.event_busy_outlined,
      'Dates you were looking at were taken',
      'Condo 101 · Dec 26–29 booked by someone else',
      '5 days ago',
      false,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: ListView.separated(
        physics: Tokens.scroll,
        padding: const EdgeInsets.symmetric(vertical: Tokens.s8),
        itemCount: _items.length,
        separatorBuilder: (_, __) => Divider(
          height: 1,
          indent: Tokens.gutter,
          color: theme.colorScheme.outlineVariant,
        ),
        itemBuilder: (context, i) {
          final (icon, title, detail, ago, unread) = _items[i];
          return Container(
            color:
                unread ? Tokens.accent.withOpacity(0.04) : Colors.transparent,
            padding: const EdgeInsets.symmetric(
              horizontal: Tokens.gutter,
              vertical: Tokens.s16,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: theme.colorScheme.surfaceContainerHighest,
                    border: Border.all(color: theme.colorScheme.outlineVariant),
                  ),
                  child: Icon(icon, size: 17),
                ),
                const SizedBox(width: Tokens.s12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: theme.textTheme.titleMedium),
                      const SizedBox(height: 2),
                      Text(detail, style: theme.textTheme.bodySmall),
                      const SizedBox(height: Tokens.s4),
                      Text(ago, style: theme.textTheme.labelSmall),
                    ],
                  ),
                ),
                if (unread)
                  Container(
                    margin: const EdgeInsets.only(top: 6, left: Tokens.s8),
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Tokens.accent,
                      shape: BoxShape.circle,
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
