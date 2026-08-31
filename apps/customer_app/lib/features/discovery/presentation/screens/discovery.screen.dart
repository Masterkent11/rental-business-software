import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/design/tokens.dart';
import '../controllers/discovery.controller.dart';
import '../sheets/filters.sheet.dart';
import '../widgets/featured_card.widget.dart';
import '../widgets/listing_card.widget.dart';

class DiscoveryScreen extends ConsumerWidget {
  const DiscoveryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final listingsAsync = ref.watch(discoveryListingsProvider);
    final lens = ref.watch(featuredLensProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Discover'),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune),
            tooltip: 'Filters',
            onPressed: () => showFiltersSheet(context),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_none_outlined),
            tooltip: 'Notifications',
            onPressed: () => context.push('/notifications'),
          ),
          IconButton(
            icon: const Icon(Icons.chat_bubble_outline),
            tooltip: 'Messages',
            onPressed: () => context.push('/messages'),
          ),
        ],
      ),
      body: listingsAsync.when(
        data: (listings) {
          final featured = listings.where((l) => l.isFeatured).toList();

          return CustomScrollView(
            slivers: [
              if (featured.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.only(
                      left: Tokens.gutter,
                      right: Tokens.gutter,
                      top: Tokens.s12,
                      bottom: Tokens.s8,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Featured Places',
                            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                          ),
                        ),
                        SegmentedButton<FeaturedLens>(
                          style: const ButtonStyle(
                            visualDensity: VisualDensity.compact,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          segments: const [
                            ButtonSegment(value: FeaturedLens.popular, label: Text('Popular')),
                            ButtonSegment(value: FeaturedLens.nearby, label: Text('Nearby')),
                          ],
                          selected: {lens},
                          onSelectionChanged: (s) => ref.read(featuredLensProvider.notifier).state = s.first,
                        ),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 230,
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
                      scrollDirection: Axis.horizontal,
                      itemCount: featured.length,
                      separatorBuilder: (_, __) => const SizedBox(width: Tokens.s12),
                      itemBuilder: (context, index) => FeaturedCard(listing: featured[index]),
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: Tokens.s16)),
              ],
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
                sliver: SliverToBoxAdapter(
                  child: Text(
                    'All Listings (${listings.length})',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: Tokens.s12)),
              if (listings.isEmpty)
                const SliverFillRemaining(
                  child: Center(
                    child: Text('No listings match your search criteria.'),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.all(Tokens.gutter),
                  sliver: SliverList.separated(
                    itemCount: listings.length,
                    separatorBuilder: (_, __) => const SizedBox(height: Tokens.s16),
                    itemBuilder: (context, index) => ListingCard(listing: listings[index]),
                  ),
                ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }
}
