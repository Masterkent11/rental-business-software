import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../design/quantity_stepper.dart';
import '../../../design/tokens.dart';
import '../../booking/widgets/date_range_calendar.dart';
import '../discovery_controller.dart';
import '../search_criteria.dart';

class SearchPanel extends ConsumerWidget {
  const SearchPanel({
    super.key,
    required this.onSearch,
  });

  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final criteria = ref.watch(searchCriteriaProvider);
    final controller = ref.read(searchCriteriaProvider.notifier);
    final spec = criteria.spec;

    final whereController = TextEditingController(
      text: criteria.destination,
    );

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(Tokens.rLg),
        border: Border.all(color: theme.colorScheme.outlineVariant),
        boxShadow: Tokens.liftHigh,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ModeTabs(
            selected: criteria.mode,
            onSelected: controller.setMode,
          ),
          // ------------------------------------- where
          _Row(
            label: 'Where?',
            child: TextField(
              controller: whereController,
              onChanged: controller.setDestination,
              textInputAction: TextInputAction.next,
              style: theme.textTheme.bodyLarge,
              decoration: InputDecoration(
                isDense: true,
                filled: false,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: EdgeInsets.zero,
                hintText: 'Barangay, city, or property',
                hintStyle: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ),

          // ------------------------------------- dates
          _Row(
            label: spec.periodLabel,
            onTap: () => _showDatesSheet(context, ref),
            child: _PeriodSlots(criteria: criteria),
          ),

          // ------------------------------------ guests
          _Row(
            label: spec.occupancyLabel,
            isLast: true,
            onTap: () => _showGuestsSheet(context, ref),
            child: Text(
              criteria.describeOccupancy(),
              style: theme.textTheme.bodyLarge,
            ),
          ),

          // ------------------------------------------ action
          Padding(
            padding: const EdgeInsets.all(Tokens.s12),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  HapticFeedback.mediumImpact();
                  controller.apply();
                  onSearch();
                },
                child: const Text('Search rentals'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showDatesSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _DatesSheet(),
    );
  }

  void _showGuestsSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _GuestsSheet(),
    );
  }
}

class _DatesSheet extends ConsumerWidget {
  const _DatesSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final criteria = ref.watch(searchCriteriaProvider);
    final controller = ref.read(searchCriteriaProvider.notifier);
    final spec = criteria.spec;
    final fmt = DateFormat('EEE, MMM d');

    final (startText, endText) = switch (criteria.period) {
      NightRange(:final checkIn, :final checkOut) => (
          checkIn == null ? 'Select date' : fmt.format(checkIn),
          checkOut == null ? 'Select date' : fmt.format(checkOut),
        ),
      TermFrom(:final startDate, :final months) => (
          startDate == null ? 'Select date' : fmt.format(startDate),
          months == null ? 'Flexible' : '$months months',
        ),
    };

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(Tokens.rLg)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 8, bottom: 4),
                width: 32,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: Tokens.s8),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  Expanded(
                    child: Text(
                      'Select ${spec.periodLabel.toLowerCase()}',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: controller.clearPeriod,
                    child: const Text('Reset'),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Container(
              padding: const EdgeInsets.all(Tokens.s12),
              color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.4),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(Tokens.s8),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surface,
                          borderRadius: BorderRadius.circular(Tokens.rMd),
                          border: Border.all(color: theme.colorScheme.outlineVariant),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              spec.startLabel.toUpperCase(),
                              style: theme.textTheme.labelSmall,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              startText,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: Tokens.s8),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(Tokens.s8),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surface,
                          borderRadius: BorderRadius.circular(Tokens.rMd),
                          border: Border.all(color: theme.colorScheme.outlineVariant),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              spec.endLabel.toUpperCase(),
                              style: theme.textTheme.labelSmall,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              endText,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(
                  horizontal: Tokens.s16,
                  vertical: Tokens.s12,
                ),
                children: [
                  DateRangeCalendar(
                    months: 12,
                    start: switch (criteria.period) {
                      NightRange(:final checkIn) => checkIn,
                      TermFrom(:final startDate) => startDate,
                    },
                    end: switch (criteria.period) {
                      NightRange(:final checkOut) => checkOut,
                      _ => null,
                    },
                    onTap: (day) => _onDay(controller, criteria, day),
                  ),
                  if (!spec.usesNightRange) ...[
                    const SizedBox(height: Tokens.s16),
                    _TermChips(criteria: criteria, controller: controller),
                    const SizedBox(height: Tokens.s32),
                  ],
                ],
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(Tokens.s16),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Select these dates'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _onDay(
    SearchCriteriaController controller,
    SearchCriteria criteria,
    DateTime day,
  ) {
    HapticFeedback.selectionClick();

    switch (criteria.period) {
      case NightRange(:final checkIn, :final checkOut):
        final (start, end) = DateRangeCalendar.select(
          day: day,
          start: checkIn,
          end: checkOut,
        );
        controller.setPeriod(NightRange(checkIn: start, checkOut: end));
      case TermFrom(:final months):
        controller.setPeriod(TermFrom(startDate: day, months: months));
    }
  }
}

class _GuestsSheet extends ConsumerWidget {
  const _GuestsSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final criteria = ref.watch(searchCriteriaProvider);
    final controller = ref.read(searchCriteriaProvider.notifier);
    final spec = criteria.spec;

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(Tokens.rLg)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 8, bottom: 4),
                width: 32,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: Tokens.s8),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  Expanded(
                    child: Text(
                      'Select ${spec.occupancyLabel.toLowerCase()}',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(Tokens.s16),
              child: Column(
                children: [
                  QuantityStepper(
                    label: '${spec.personNoun[0].toUpperCase()}'
                        '${spec.personNoun.substring(1)}s',
                    value: criteria.occupancy.adults,
                    min: 1,
                    max: 16,
                    compact: false,
                    onChanged: (v) => controller.setOccupancy(
                      criteria.occupancy.copyWith(adults: v),
                    ),
                  ),
                  if (spec.showsChildren) ...[
                    const SizedBox(height: Tokens.s16),
                    QuantityStepper(
                      label: 'Children',
                      value: criteria.occupancy.children,
                      max: 10,
                      compact: false,
                      onChanged: (v) => controller.setOccupancy(
                        criteria.occupancy.copyWith(children: v),
                      ),
                    ),
                  ],
                  const SizedBox(height: Tokens.s16),
                  QuantityStepper(
                    label: '${spec.unitNoun[0].toUpperCase()}'
                        '${spec.unitNoun.substring(1)}s',
                    value: criteria.occupancy.units,
                    min: 1,
                    max: 8,
                    compact: false,
                    onChanged: (v) => controller.setOccupancy(
                      criteria.occupancy.copyWith(units: v),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(Tokens.s16),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Apply'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ModeTabs extends StatelessWidget {
  const _ModeTabs({required this.selected, required this.onSelected});

  final SearchMode selected;
  final ValueChanged<SearchMode> onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: theme.colorScheme.outlineVariant),
        ),
      ),
      child: Row(
        children: [
          for (final spec in SearchModeSpec.offered)
            Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  HapticFeedback.selectionClick();
                  onSelected(spec.mode);
                },
                child: Container(
                  height: 46,
                  alignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        color: spec.mode == selected
                            ? theme.colorScheme.primary
                            : Colors.transparent,
                        width: 2,
                      ),
                    ),
                  ),
                  child: Text(
                    spec.tabLabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: spec.mode == selected
                          ? theme.colorScheme.onSurface
                          : theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.label,
    required this.child,
    this.onTap,
    this.isLast = false,
  });

  final String label;
  final Widget child;
  final VoidCallback? onTap;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap == null
          ? null
          : () {
              HapticFeedback.selectionClick();
              onTap!();
            },
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.fromLTRB(
          Tokens.s16,
          Tokens.s12,
          Tokens.s16,
          isLast ? Tokens.s8 : Tokens.s12,
        ),
        decoration: BoxDecoration(
          border: isLast
              ? null
              : Border(
                  bottom: BorderSide(color: theme.colorScheme.outlineVariant),
                ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(label, style: theme.textTheme.labelSmall),
              ],
            ),
            const SizedBox(height: Tokens.s4),
            child,
          ],
        ),
      ),
    );
  }
}

class _PeriodSlots extends StatelessWidget {
  const _PeriodSlots({required this.criteria});

  final SearchCriteria criteria;

  @override
  Widget build(BuildContext context) {
    final spec = criteria.spec;
    final fmt = DateFormat('MMM d');

    final start = switch (criteria.period) {
      NightRange(:final checkIn) => checkIn,
      TermFrom(:final startDate) => startDate,
    };
    final endText = spec.usesNightRange
        ? switch (criteria.period) {
            NightRange(:final checkOut) =>
              checkOut == null ? 'Add' : fmt.format(checkOut),
            _ => 'Add',
          }
        : switch (criteria.period) {
            TermFrom(:final months) =>
              months == null ? 'Any' : '$months months',
            _ => 'Any',
          };

    return Row(
      children: [
        Expanded(
          child: _Slot(
            caption: spec.startLabel,
            value: start == null ? 'Add' : fmt.format(start),
            muted: start == null,
          ),
        ),
        Expanded(
          child: _Slot(
            caption: spec.endLabel,
            value: endText,
            muted: endText == 'Add' || endText == 'Any',
          ),
        ),
      ],
    );
  }
}

class _Slot extends StatelessWidget {
  const _Slot({
    required this.caption,
    required this.value,
    required this.muted,
  });

  final String caption;
  final String value;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(caption, style: theme.textTheme.bodySmall),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: theme.textTheme.titleMedium?.copyWith(
            color: muted ? theme.colorScheme.onSurfaceVariant : null,
          ),
        ),
      ],
    );
  }
}

class _TermChips extends StatelessWidget {
  const _TermChips({required this.criteria, required this.controller});

  final SearchCriteria criteria;
  final SearchCriteriaController controller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Wrap(
      spacing: Tokens.s8,
      runSpacing: Tokens.s8,
      children: [
        for (final term in const [3, 6, 12, 24])
          GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              controller.setPeriod(
                TermFrom(
                  startDate: switch (criteria.period) {
                    TermFrom(:final startDate) => startDate,
                    _ => null,
                  },
                  months: term,
                ),
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 9,
              ),
              decoration: BoxDecoration(
                color: switch (criteria.period) {
                      TermFrom(:final months) => months == term,
                      _ => false,
                    }
                    ? theme.colorScheme.primary
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: theme.colorScheme.outlineVariant),
              ),
              child: Text(
                '$term months',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: switch (criteria.period) {
                        TermFrom(:final months) => months == term,
                        _ => false,
                      }
                      ? theme.colorScheme.onPrimary
                      : null,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
