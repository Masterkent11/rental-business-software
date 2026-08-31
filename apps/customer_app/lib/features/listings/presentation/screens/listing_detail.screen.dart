import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/design/app_image.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/domain/value_objects/money.value_object.dart';
import '../../../saved/presentation/controllers/saved.controller.dart';
import '../../domain/entities/listing.entity.dart';
import '../../domain/value_objects/listing_kind.value_object.dart';
import '../controllers/listings.controller.dart';
import '../widgets/move_in_cost_card.widget.dart';

class ListingDetailScreen extends ConsumerWidget {
  const ListingDetailScreen({
    required this.listingId,
    this.initialCard,
    super.key,
  });

  final String listingId;
  final Listing? initialCard;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final detailAsync = ref.watch(listingDetailProvider(listingId));
    final isSaved = ref.watch(isSavedProvider(listingId));

    final card = detailAsync.valueOrNull?.card ?? initialCard;
    final detail = detailAsync.valueOrNull;

    if (card == null) {
      return detailAsync.when(
        data: (_) => Scaffold(
          appBar: AppBar(),
          body: const Center(child: Text('Listing not found')),
        ),
        loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
        error: (err, _) => Scaffold(body: Center(child: Text('Error: $err'))),
      );
    }

    final isLongTerm = card.kind == ListingKind.longTerm;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Tokens.surface,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: Icon(
              isSaved ? Icons.favorite : Icons.favorite_border,
              color: isSaved ? Tokens.danger : Tokens.ink,
            ),
            onPressed: () {
              ref.read(savedIdsProvider.notifier).toggle(listingId);
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          if (card.photos.isNotEmpty)
            SizedBox(
              height: 260,
              child: PageView.builder(
                itemCount: card.photos.length,
                itemBuilder: (context, index) => AppImage(url: card.photos[index]),
              ),
            )
          else
            Container(height: 200, color: Tokens.surfaceSubtle),
          Padding(
            padding: const EdgeInsets.all(Tokens.gutter),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: const BoxDecoration(
                        color: Tokens.surfaceSubtle,
                        borderRadius: Tokens.borderXs,
                      ),
                      child: Text(
                        card.resourceType.label,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Tokens.inkMuted),
                      ),
                    ),
                    const SizedBox(width: Tokens.s8),
                    Expanded(
                      child: Text(
                        card.availabilityLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Tokens.accent, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: Tokens.s12),
                Text(
                  card.title,
                  style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: Tokens.s4),
                Text(
                  '${card.propertyName} · ${card.location}',
                  style: theme.textTheme.bodyMedium?.copyWith(color: Tokens.inkMuted),
                ),
                const SizedBox(height: Tokens.s12),
                Text(
                  '${Money.formatPesos(card.priceCentavos)} ${isLongTerm ? "/ month" : "/ night"}',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Tokens.ink,
                  ),
                ),
                const SizedBox(height: Tokens.s16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: !card.isAvailable
                        ? null
                        : () {
                            if (isLongTerm) {
                              context.push('/apply', extra: card);
                            } else {
                              context.push('/booking/dates', extra: card);
                            }
                          },
                    child: Text(
                      !card.isAvailable
                          ? 'Unavailable'
                          : isLongTerm
                              ? 'Apply now'
                              : 'Reserve',
                    ),
                  ),
                ),
                const SizedBox(height: Tokens.s20),
                if (card.hasTour) ...[
                  InkWell(
                    onTap: () {
                      context.push(
                        '/tour/${card.id}',
                        extra: (listing: card, detail: detail),
                      );
                    },
                    borderRadius: Tokens.borderLg,
                    child: Container(
                      padding: const EdgeInsets.all(Tokens.s16),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                        ),
                        borderRadius: Tokens.borderLg,
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.view_in_ar, color: Tokens.surface, size: 28),
                          const SizedBox(width: Tokens.s16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Take a 360° Virtual Tour',
                                  style: TextStyle(color: Tokens.surface, fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                                Text(
                                  'Walk through ${card.sceneCount} rooms before visiting',
                                  style: const TextStyle(color: Tokens.inkSubtle, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.arrow_forward_ios, color: Tokens.surface, size: 14),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: Tokens.s20),
                ],
                if (card.moveInCost != null) ...[
                  MoveInCostCard(
                    cost: card.moveInCost!,
                    monthlyCentavos: card.priceCentavos,
                  ),
                  const SizedBox(height: Tokens.s20),
                ],
                if (detail != null && detail.description.isNotEmpty) ...[
                  Text('About this place', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: Tokens.s8),
                  Text(detail.description, style: theme.textTheme.bodyMedium),
                  const SizedBox(height: Tokens.s20),
                ],
                if (detail != null && detail.amenities.isNotEmpty) ...[
                  Text('Amenities', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: Tokens.s8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: detail.amenities.map((a) => Chip(label: Text(a))).toList(),
                  ),
                  const SizedBox(height: Tokens.s20),
                ],
                if (detail != null && detail.houseRules.isNotEmpty) ...[
                  Text('House Rules', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: Tokens.s8),
                  for (final rule in detail.houseRules)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_outline, size: 16, color: Tokens.accent),
                          const SizedBox(width: 8),
                          Text(rule),
                        ],
                      ),
                    ),
                  const SizedBox(height: Tokens.s20),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
