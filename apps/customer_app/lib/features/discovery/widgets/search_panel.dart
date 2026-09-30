import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../design/quantity_stepper.dart';
import '../../../design/tokens.dart';
import '../../booking/widgets/date_range_calendar.dart';
import '../discovery_controller.dart';
import '../filters_sheet.dart';
import '../search_criteria.dart';

class SearchPanel extends ConsumerStatefulWidget {
  const SearchPanel({
    super.key,
    required this.onSearch,
    this.onFilter,
  });

  final VoidCallback onSearch;
  final VoidCallback? onFilter;

  @override
  ConsumerState<SearchPanel> createState() => _SearchPanelState();
}

class _SearchPanelState extends ConsumerState<SearchPanel> {
  late final TextEditingController _whereController;

  @override
  void initState() {
    super.initState();
    _whereController = TextEditingController(
      text: ref.read(searchCriteriaProvider).destination,
    );
  }

  @override
  void dispose() {
    _whereController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final criteria = ref.watch(searchCriteriaProvider);
    final controller = ref.read(searchCriteriaProvider.notifier);
    final filters = ref.watch(filtersProvider);

    if (_whereController.text != criteria.destination) {
      _whereController.value = TextEditingValue(
        text: criteria.destination,
        selection: TextSelection.collapsed(offset: criteria.destination.length),
      );
    }

    final isShortStay = criteria.mode == SearchMode.stay;

    final fmt = DateFormat('MMM d, yyyy');
    final (checkInText, checkOutText) = switch (criteria.period) {
      NightRange(:final checkIn, :final checkOut) => (
          checkIn == null ? 'Apr 12, 2025' : fmt.format(checkIn),
          checkOut == null ? 'Apr 16, 2025' : fmt.format(checkOut),
        ),
      TermFrom(:final startDate, :final months) => (
          startDate == null ? 'Add date' : fmt.format(startDate),
          months == null ? 'Any' : '$months mos',
        ),
    };

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Expanded(
              child: Container(
                height: 46,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Tokens.hairline),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x05000000),
                      blurRadius: 6,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.search_rounded,
                      size: 20,
                      color: Tokens.muted,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _whereController,
                        onChanged: (val) {
                          controller.setDestination(val);
                          controller.apply();
                        },
                        onSubmitted: (_) {
                          controller.apply();
                          widget.onSearch();
                        },
                        textInputAction: TextInputAction.search,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Tokens.ink,
                        ),
                        decoration: const InputDecoration(
                          isDense: true,
                          filled: false,
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: EdgeInsets.zero,
                          hintText: 'Search location, property, or keyword',
                          hintStyle: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                            color: Tokens.muted,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 10),
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: widget.onFilter ?? () => showFiltersSheet(context),
              child: Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Tokens.hairline),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x05000000),
                      blurRadius: 6,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    const Icon(
                      Icons.tune_rounded,
                      size: 19,
                      color: Tokens.primaryNavy,
                    ),
                    if (filters.activeCount > 0)
                      Positioned(
                        top: 9,
                        right: 9,
                        child: Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: Tokens.primaryBlue,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          height: 38,
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F2F4),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    controller.setMode(SearchMode.stay);
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    curve: Curves.easeOut,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color:
                          isShortStay ? Tokens.primaryNavy : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Short stay',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight:
                            isShortStay ? FontWeight.w600 : FontWeight.w500,
                        color: isShortStay ? Colors.white : Tokens.muted,
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    controller.setMode(SearchMode.monthly);
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    curve: Curves.easeOut,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: !isShortStay
                          ? Tokens.primaryNavy
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Monthly rental',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight:
                            !isShortStay ? FontWeight.w600 : FontWeight.w500,
                        color: !isShortStay ? Colors.white : Tokens.muted,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Container(
          height: 52,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Tokens.hairline),
            boxShadow: const [
              BoxShadow(
                color: Color(0x05000000),
                blurRadius: 6,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: _ControlSlot(
                  icon: Icons.calendar_today_outlined,
                  label: isShortStay ? 'Check in' : 'Move in',
                  value: checkInText,
                  onTap: () => _showDatesSheet(context, ref),
                ),
              ),
              Container(
                width: 1,
                height: 24,
                color: Tokens.hairline,
              ),
              Expanded(
                child: _ControlSlot(
                  icon: isShortStay
                      ? Icons.calendar_today_outlined
                      : Icons.access_time_rounded,
                  label: isShortStay ? 'Check out' : 'Duration',
                  value: checkOutText,
                  onTap: () => _showDatesSheet(context, ref),
                ),
              ),
              Container(
                width: 1,
                height: 24,
                color: Tokens.hairline,
              ),
              Expanded(
                child: _ControlSlot(
                  icon: isShortStay
                      ? Icons.people_outline_rounded
                      : Icons.account_balance_wallet_outlined,
                  label: isShortStay ? 'Guests' : 'Budget',
                  value: isShortStay ? '${criteria.occupancy.people}' : 'Any',
                  hasChevron: true,
                  onTap: isShortStay
                      ? () => _showGuestsSheet(context, ref)
                      : () => showFiltersSheet(context),
                ),
              ),
            ],
          ),
        ),
      ],
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

class _ControlSlot extends StatelessWidget {
  const _ControlSlot({
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
    this.hasChevron = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;
  final bool hasChevron;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Row(
          children: [
            Icon(icon, size: 15, color: Tokens.primaryNavy),
            const SizedBox(width: 5),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: Tokens.muted,
                    ),
                  ),
                  Text(
                    value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: Tokens.primaryNavy,
                      letterSpacing: -0.1,
                    ),
                  ),
                ],
              ),
            ),
            if (hasChevron)
              const Icon(
                Icons.keyboard_arrow_down_rounded,
                size: 14,
                color: Tokens.muted,
              ),
          ],
        ),
      ),
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
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(Tokens.rLg)),
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
                          border: Border.all(
                              color: theme.colorScheme.outlineVariant),
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
                          border: Border.all(
                              color: theme.colorScheme.outlineVariant),
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
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(Tokens.rLg)),
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
                    label:
                        '${spec.personNoun[0].toUpperCase()}${spec.personNoun.substring(1)}s',
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
                    label:
                        '${spec.unitNoun[0].toUpperCase()}${spec.unitNoun.substring(1)}s',
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
