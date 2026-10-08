import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../design/app_image.dart';
import '../../../design/tokens.dart';
import '../../../fixtures/view_models.dart';
import '../../saved/saved_controller.dart';

class BuyListingCard extends ConsumerWidget {
  const BuyListingCard({required this.listing, required this.onTap, this.onToggleSave, super.key});

  final ListingCardView listing;
  final VoidCallback onTap;
  final VoidCallback? onToggleSave;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(isSavedProvider(listing.id));
    final facts = [
      if (listing.beds > 0) '${listing.beds} bd',
      if (listing.baths > 0) '${listing.baths} ba',
      if (listing.sqm != null) '${listing.sqm} m²',
      if (listing.sqm == null && listing.lotAreaSqm != null) '${listing.lotAreaSqm} m² lot',
      if (listing.parkingSlots > 0) '${listing.parkingSlots} prk',
    ];
    return Semantics(
      button: true,
      label: '${listing.title}, ${listing.place}, $kPriceOnInquiry',
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(Tokens.rMd),
            border: Border.all(color: Tokens.hairline),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(Tokens.rMd)),
                child: AspectRatio(
                  aspectRatio: 16 / 10,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Hero(
                        tag: 'photo-${listing.id}',
                        child: AppImage(
                          url: listing.photos.isEmpty ? '' : listing.photos.first,
                          fallbackIcon: Icons.home_work_outlined,
                          cacheWidth: 720,
                        ),
                      ),
                      Positioned(
                        left: 10,
                        top: 10,
                        child: Row(
                          children: [
                            _Badge(label: listing.typeLabel),
                            if (listing.saleStatus == 'PRE_SELLING') ...[
                              const SizedBox(width: 6),
                              const _Badge(label: 'Pre-selling'),
                            ],
                          ],
                        ),
                      ),
                      if (listing.hasTour)
                        const Positioned(
                          left: 10,
                          bottom: 10,
                          child: _Badge(label: '360°', icon: Icons.threed_rotation, dark: true),
                        ),
                      if (onToggleSave != null)
                        Positioned(
                          right: 8,
                          top: 8,
                          child: IconButton(
                            onPressed: onToggleSave,
                            tooltip: saved ? 'Remove from saved' : 'Save',
                            style: IconButton.styleFrom(backgroundColor: Colors.white.withValues(alpha: 0.92)),
                            icon: Icon(saved ? Icons.favorite : Icons.favorite_border, size: 19, color: saved ? Tokens.taken : Tokens.primaryNavy),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(Tokens.s12, Tokens.s12, Tokens.s12, Tokens.s12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      listing.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700, color: Tokens.primaryNavy, letterSpacing: -0.2),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 14, color: Tokens.muted),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            [listing.place, if (listing.distanceLabel != null) listing.distanceLabel!].join(' · '),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12.5, color: Tokens.muted),
                          ),
                        ),
                      ],
                    ),
                    if (facts.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(facts.join('  ·  '), style: const TextStyle(fontSize: 12.5, color: Tokens.primaryNavy)),
                    ],
                    const SizedBox(height: 8),
                    const Row(
                      children: [
                        Icon(Icons.lock_outline, size: 14, color: Tokens.primaryNavy),
                        SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            kPriceOnInquiry,
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Tokens.primaryNavy),
                          ),
                        ),
                      ],
                    ),
                    if (listing.representative != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: Tokens.softBlue.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(Tokens.rSm),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 13,
                              backgroundColor: Tokens.softBlue,
                              foregroundImage: listing.representative!.photoUrl == null
                                  ? null
                                  : NetworkImage(listing.representative!.photoUrl!),
                              child: Text(
                                listing.representative!.displayName.isNotEmpty
                                    ? listing.representative!.displayName[0].toUpperCase()
                                    : 'A',
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Tokens.primaryNavy),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          listing.representative!.displayName,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: Tokens.primaryNavy,
                                          ),
                                        ),
                                      ),
                                      if (listing.representative!.verified) ...[
                                        const SizedBox(width: 3),
                                        const Icon(Icons.verified, size: 12, color: Tokens.primaryBlue),
                                      ],
                                    ],
                                  ),
                                  Text(
                                    listing.representative!.headline.isNotEmpty
                                        ? listing.representative!.headline
                                        : 'Real Estate Agent',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 11, color: Tokens.muted),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label, this.icon, this.dark = false});

  final String label;
  final IconData? icon;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: dark ? Colors.black.withValues(alpha: 0.6) : Colors.white.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: dark ? Colors.white : Tokens.primaryNavy),
            const SizedBox(width: 3),
          ],
          Text(label, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: dark ? Colors.white : Tokens.primaryNavy)),
        ],
      ),
    );
  }
}
