import '../explore_icons.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../data/discovery_repository.dart';
import '../../../../design/controls.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import '../../application/search_suggestions.dart';
import '../../domain/listing_category.dart';

class SearchSuggestionsPanel extends ConsumerWidget {
  const SearchSuggestionsPanel({
    required this.text,
    required this.intent,
    required this.onRecent,
    required this.onLocation,
    required this.onListing,
    required this.onCategory,
    super.key,
  });

  final String text;
  final MarketIntent intent;
  final ValueChanged<String> onRecent;
  final ValueChanged<LocationSuggestionView> onLocation;
  final ValueChanged<ListingSuggestionView> onListing;
  final ValueChanged<ListingCategory> onCategory;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (text.trim().length < kMinSuggestionLength) {
      final recent = ref.watch(recentSearchesProvider);
      if (recent.isEmpty) {
        return const Padding(
          padding: EdgeInsets.symmetric(vertical: Tokens.s8),
          child: Text('Search by city, barangay, landmark or property name.', style: AppText.caption),
        );
      }
      return _Panel(
        children: [
          Row(
            children: [
              const Expanded(child: Text('Recent searches', style: AppText.captionStrong)),
              AppTextAction(label: 'Clear', onPressed: () => ref.read(recentSearchesProvider.notifier).clear()),
            ],
          ),
          for (final item in recent) _Row(icon: Icons.history_rounded, title: item, onTap: () => onRecent(item)),
        ],
      );
    }
    final suggestions = ref.watch(searchSuggestionsProvider((text: text, intent: intent)));
    return _Panel(
      children: switch (suggestions) {
        AsyncData(:final value) when value.isEmpty => [
            const Padding(
              padding: EdgeInsets.symmetric(vertical: Tokens.s8),
              child: Text('No matching places or listings. Press search to look anyway.', style: AppText.caption),
            ),
          ],
        AsyncData(:final value) => [
            for (final location in value.locations)
              _Row(
                icon: Icons.location_on_outlined,
                title: location.label,
                subtitle: location.listingCount == 1 ? '1 listing' : '${location.listingCount} listings',
                onTap: () => onLocation(location),
              ),
            for (final category in value.categories)
              _Row(
                  icon: category.icon, title: category.plural, subtitle: 'Category', onTap: () => onCategory(category)),
            for (final listing in value.listings)
              _Row(
                  icon: Icons.home_work_outlined,
                  title: listing.title,
                  subtitle: listing.place,
                  onTap: () => onListing(listing)),
          ],
        AsyncError() => [
            const Padding(
              padding: EdgeInsets.symmetric(vertical: Tokens.s8),
              child: Text('Suggestions are unavailable right now. You can still search.', style: AppText.caption),
            ),
          ],
        _ => [
            const Padding(
              padding: EdgeInsets.symmetric(vertical: Tokens.s12),
              child: Center(
                  child:
                      SizedBox.square(dimension: Tokens.spinnerSm, child: CircularProgressIndicator(strokeWidth: 2))),
            ),
          ],
      },
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: Tokens.s12, vertical: Tokens.s4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Tokens.rControl),
        border: Border.all(color: Tokens.hairline),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.title, required this.onTap, this.subtitle});

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: subtitle == null ? title : '$title, $subtitle',
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: Tokens.tap),
          child: Row(
            children: [
              Icon(icon, size: Tokens.iconMd, color: Tokens.muted),
              const SizedBox(width: Tokens.s12),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.control),
                    if (subtitle != null)
                      Text(subtitle!, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.caption),
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
