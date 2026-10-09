import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import '../../../location/location_controller.dart';
import '../../application/explore_controller.dart';
import '../../domain/explore_query.dart';

Future<void> showSortSheet(BuildContext context, ExploreQuery seed) => showModalBottomSheet<void>(
      context: context,
      builder: (_) => _SortSheet(seed: seed),
    );

class _SortSheet extends ConsumerWidget {
  const _SortSheet({required this.seed});

  final ExploreQuery seed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = ref.watch(exploreQueryProvider(seed));
    final hasCoordinates = ref.watch(locationProvider.select((s) => s.isNearMe));
    final sorts = ExploreSort.values.where((s) => s.availableFor(query.intent, hasCoordinates: hasCoordinates));
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Sort by', style: AppText.sectionTitle),
            const SizedBox(height: Tokens.s8),
            for (final sort in sorts)
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(sort.label, style: AppText.control),
                trailing: query.sort == sort
                    ? const Icon(Icons.check_rounded, color: Tokens.primaryNavy)
                    : const SizedBox.shrink(),
                onTap: () {
                  ref.read(exploreQueryProvider(seed).notifier).setSort(sort);
                  Navigator.of(context).pop();
                },
              ),
          ],
        ),
      ),
    );
  }
}
