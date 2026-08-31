import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/design/app_image.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/domain/value_objects/money.value_object.dart';
import '../../../listings/domain/entities/listing.entity.dart';

class FeaturedCard extends StatelessWidget {
  const FeaturedCard({required this.listing, super.key});
  final Listing listing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: () => context.push('/listing/${listing.id}', extra: listing),
      borderRadius: Tokens.borderLg,
      child: Container(
        width: 260,
        decoration: BoxDecoration(
          color: Tokens.surface,
          borderRadius: Tokens.borderLg,
          border: Border.all(color: Tokens.line),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (listing.photos.isNotEmpty)
              AppImage(url: listing.photos.first, height: 140, width: double.infinity)
            else
              Container(height: 140, color: Tokens.surfaceSubtle),
            Padding(
              padding: const EdgeInsets.all(Tokens.s12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    listing.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    listing.propertyName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(color: Tokens.inkMuted),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    Money.formatPesos(listing.priceCentavos),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
