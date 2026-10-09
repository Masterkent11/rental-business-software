import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import '../../../location/location_controller.dart';
import '../../../location/location_sheet.dart';
import '../../application/explore_controller.dart';
import '../../application/explore_results.dart';
import '../../domain/explore_query.dart';
import 'sort_sheet.dart';

class ResultsCountBar extends ConsumerWidget {
  const ResultsCountBar({
    required this.seed,
    required this.singularNoun,
    required this.pluralNoun,
    this.showSort = true,
    super.key,
  });

  final ExploreQuery seed;
  final String singularNoun;
  final String pluralNoun;
  final bool showSort;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final total = ref.watch(exploreResultsProvider(seed).select((s) => s.valueOrNull?.total));
    final sort = ref.watch(exploreQueryProvider(seed).select((q) => q.sort));
    final location = ref.watch(locationProvider);
    final count = total == null ? null : '$total ${total == 1 ? singularNoun : pluralNoun}';
    final place = location.locating ? 'Locating…' : location.place.label;
    return Padding(
      padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s4, Tokens.s8, Tokens.s8),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              button: true,
              label: '${count ?? ''} in $place. Change location',
              excludeSemantics: true,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  HapticFeedback.selectionClick();
                  showLocationSheet(context);
                },
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: Tokens.tap),
                  child: Row(
                    children: [
                      if (count != null) ...[
                        Text(count, style: AppText.cardTitle),
                        const SizedBox(width: Tokens.s6),
                      ],
                      Icon(
                        location.isNearMe ? Icons.near_me_outlined : Icons.location_on_outlined,
                        size: Tokens.iconSm,
                        color: Tokens.muted,
                      ),
                      const SizedBox(width: Tokens.s2),
                      Flexible(
                        child: Text(place, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.caption),
                      ),
                      const Icon(Icons.keyboard_arrow_down_rounded, size: Tokens.iconSm, color: Tokens.muted),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (showSort)
            TextButton.icon(
              onPressed: () => showSortSheet(context, seed),
              style: TextButton.styleFrom(
                foregroundColor: Tokens.primaryNavy,
                minimumSize: const Size(Tokens.tap, Tokens.tap),
                textStyle: AppText.chip,
              ),
              icon: const Icon(Icons.swap_vert_rounded, size: Tokens.iconMd),
              label: Text(sort == ExploreSort.recommended ? 'Sort' : sort.label),
            ),
        ],
      ),
    );
  }
}
