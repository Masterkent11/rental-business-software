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
                      if (listing.hasTour)
                        Positioned(
                          left: 10,
                          bottom: 10,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.65),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.view_in_ar_outlined, size: 14, color: Colors.white),
                                SizedBox(width: 5),
                                Text.rich(
                                  TextSpan(
                                    text: '360°\u200b Tour',
                                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      if (listing.photos.isNotEmpty)
                        Positioned(
                          right: 10,
                          bottom: 10,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(999)),
                            child: Text('1/${listing.photos.length}', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                          ),
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
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Tokens.primaryNavy, letterSpacing: -0.2),
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
                    const SizedBox(height: 6),
                    const Row(
                      children: [
                        Icon(Icons.lock_outline, size: 14, color: Tokens.primaryNavy),
                        SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            kPriceOnInquiry,
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Tokens.primaryNavy),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          if (listing.beds > 0) ...[
                            const Icon(Icons.bed_outlined, size: 16, color: Tokens.primaryNavy),
                            const SizedBox(width: 4),
                            Text('${listing.beds} Beds', style: const TextStyle(fontSize: 12, color: Tokens.primaryNavy, fontWeight: FontWeight.w500)),
                            const SizedBox(width: 12),
                          ],
                          if (listing.baths > 0) ...[
                            const Icon(Icons.bathtub_outlined, size: 16, color: Tokens.primaryNavy),
                            const SizedBox(width: 4),
                            Text('${listing.baths} Baths', style: const TextStyle(fontSize: 12, color: Tokens.primaryNavy, fontWeight: FontWeight.w500)),
                            const SizedBox(width: 12),
                          ],
                          if (listing.sqm != null || listing.lotAreaSqm != null) ...[
                            const Icon(Icons.aspect_ratio, size: 16, color: Tokens.primaryNavy),
                            const SizedBox(width: 4),
                            Text('${listing.sqm ?? listing.lotAreaSqm} sqm', style: const TextStyle(fontSize: 12, color: Tokens.primaryNavy, fontWeight: FontWeight.w500)),
                            const SizedBox(width: 12),
                          ],
                          if (listing.parkingSlots > 0) ...[
                            const Icon(Icons.directions_car_outlined, size: 16, color: Tokens.primaryNavy),
                            const SizedBox(width: 4),
                            Text('${listing.parkingSlots} Garage', style: const TextStyle(fontSize: 12, color: Tokens.primaryNavy, fontWeight: FontWeight.w500)),
                          ],
                        ],
                      ),
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
