import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/design/tokens.dart';
import '../../../discovery/presentation/widgets/listing_card.widget.dart';
import '../controllers/saved.controller.dart';

class SavedScreen extends ConsumerWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final savedAsync = ref.watch(savedListingsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Saved Places')),
      body: savedAsync.when(
        data: (listings) {
          if (listings.isEmpty) {
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
                    child: const Icon(Icons.favorite_border, size: 28, color: Tokens.inkMuted),
                  ),
                  const SizedBox(height: Tokens.s16),
                  Text(
                    'No saved places yet',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: Tokens.s8),
                  Text(
                    'Tap the heart on any place to keep a shortlist and compare move-in costs.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(color: Tokens.inkMuted),
                  ),
                  const SizedBox(height: Tokens.s20),
                  FilledButton(
                    onPressed: () => context.go('/'),
                    child: const Text('Discover places'),
                  ),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(Tokens.gutter),
            itemCount: listings.length,
            separatorBuilder: (_, __) => const SizedBox(height: Tokens.s16),
            itemBuilder: (context, index) => ListingCard(listing: listings[index]),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error loading saved listings: $err')),
      ),
    );
  }
}
