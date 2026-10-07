import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../design/money.dart';
import '../../design/tokens.dart';
import '../../fixtures/view_models.dart';
import 'discovery_controller.dart';

Future<void> showFiltersSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (_) => const _FiltersSheet(),
  );
}

class _FiltersSheet extends ConsumerWidget {
  const _FiltersSheet();

  static const _priceSteps = <int?>[null, 500000, 1000000, 1500000];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final f = ref.watch(filtersProvider);
    final controller = ref.read(filtersProvider.notifier);
    final matches = ref.watch(resultsProvider).valueOrNull?.total ?? 0;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          Tokens.gutter,
          Tokens.s8,
          Tokens.gutter,
          Tokens.s24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('Filters', style: theme.textTheme.headlineSmall),
                const Spacer(),
                if (f.isFiltered)
                  TextButton(
                    onPressed: () {
                      HapticFeedback.selectionClick();
                      controller.clear();
                    },
                    child: const Text('Clear all'),
                  ),
              ],
            ),
            const SizedBox(height: Tokens.s20),
            const _Label('How you want to rent'),
            const SizedBox(height: Tokens.s12),
            Wrap(
              spacing: Tokens.s8,
              children: [
                _Pill(
                  label: 'Any',
                  selected: f.kind == null,
                  onTap: () => controller.setKind(null),
                ),
                for (final kind in ListingKind.values)
                  _Pill(
                    label: kind.label,
                    selected: f.kind == kind,
                    onTap: () => controller.setKind(kind),
                  ),
              ],
            ),
            const SizedBox(height: Tokens.s24),
            const _Label('What kind of place'),
            const SizedBox(height: Tokens.s12),
            Wrap(
              spacing: Tokens.s8,
              runSpacing: Tokens.s8,
              children: [
                _Pill(
                  label: 'Any',
                  selected: f.type == null,
                  onTap: () => controller.setType(null),
                ),
                for (final type in ResourceType.values)
                  _Pill(
                    label: type.label,
                    selected: f.type == type,
                    onTap: () => controller.setType(type),
                  ),
              ],
            ),
            const SizedBox(height: Tokens.s24),
            const _Label('Budget'),
            const SizedBox(height: Tokens.s12),
            Wrap(
              spacing: Tokens.s8,
              runSpacing: Tokens.s8,
              children: [
                for (final step in _priceSteps)
                  _Pill(
                    label: step == null ? 'Any' : 'Under ${Money.peso(step)}',
                    selected: f.maxCentavos == step,
                    onTap: () => controller.setMax(step),
                  ),
              ],
            ),
            const SizedBox(height: Tokens.s20),
            _Toggle(
              label: 'Has a virtual tour',
              caption: 'See it properly before you travel',
              value: f.tourOnly,
              onChanged: controller.setTourOnly,
            ),
            _Toggle(
              label: 'Available only',
              caption: 'Hide places that are already taken',
              value: f.availableOnly,
              onChanged: controller.setAvailableOnly,
            ),
            const SizedBox(height: Tokens.s24),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(
                matches == 0
                    ? 'No matches'
                    : 'Show $matches ${matches == 1 ? "place" : "places"}',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;

  @override
  Widget build(BuildContext context) =>
      Text(text.toUpperCase(), style: Theme.of(context).textTheme.labelSmall);
}

class _Pill extends StatelessWidget {
  const _Pill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
        decoration: BoxDecoration(
          color: selected ? theme.colorScheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected
                ? theme.colorScheme.primary
                : theme.colorScheme.outlineVariant,
          ),
        ),
        child: Text(
          label,
          style: theme.textTheme.labelMedium?.copyWith(
            color: selected ? theme.colorScheme.onPrimary : null,
          ),
        ),
      ),
    );
  }
}

class _Toggle extends StatelessWidget {
  const _Toggle({
    required this.label,
    required this.caption,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final String caption;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Tokens.s4),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: theme.textTheme.bodyLarge),
                Text(caption, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          Switch.adaptive(
            value: value,
            activeTrackColor: theme.colorScheme.primary,
            onChanged: (v) {
              HapticFeedback.selectionClick();
              onChanged(v);
            },
          ),
        ],
      ),
    );
  }
}
