import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/design/tokens.dart';
import '../../../listings/domain/value_objects/listing_kind.value_object.dart';
import '../../../listings/domain/value_objects/resource_type.value_object.dart';
import '../controllers/search_criteria.controller.dart';

Future<void> showFiltersSheet(BuildContext context) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const FiltersSheet(),
    );

class FiltersSheet extends ConsumerWidget {
  const FiltersSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final filters = ref.watch(searchCriteriaProvider);
    final notifier = ref.read(searchCriteriaProvider.notifier);

    return Padding(
      padding: const EdgeInsets.all(Tokens.gutter),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Filters', style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
              TextButton(
                onPressed: () => notifier.reset(),
                child: const Text('Reset'),
              ),
            ],
          ),
          const SizedBox(height: Tokens.s16),
          Text('Rental Kind', style: theme.textTheme.titleSmall),
          const SizedBox(height: Tokens.s8),
          SegmentedButton<ListingKind?>(
            segments: const [
              ButtonSegment(value: null, label: Text('All')),
              ButtonSegment(value: ListingKind.longTerm, label: Text('Long-term')),
              ButtonSegment(value: ListingKind.shortTerm, label: Text('Nightly')),
            ],
            selected: {filters.kind},
            onSelectionChanged: (s) => notifier.setKind(s.first),
          ),
          const SizedBox(height: Tokens.s20),
          Text('Property Type', style: theme.textTheme.titleSmall),
          const SizedBox(height: Tokens.s8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: ResourceType.values.map((type) {
              final isSelected = filters.resourceTypes.contains(type);
              return FilterChip(
                label: Text(type.label),
                selected: isSelected,
                onSelected: (_) => notifier.toggleResourceType(type),
              );
            }).toList(),
          ),
          const SizedBox(height: Tokens.s20),
          SwitchListTile(
            title: const Text('Must have 360° Virtual Tour'),
            value: filters.hasTourOnly,
            onChanged: (v) => notifier.setHasTourOnly(v),
            contentPadding: EdgeInsets.zero,
          ),
          SwitchListTile(
            title: const Text('Available listings only'),
            value: filters.availableOnly,
            onChanged: (v) => notifier.setAvailableOnly(v),
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: Tokens.s24),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Show Results'),
          ),
        ],
      ),
    );
  }
}
