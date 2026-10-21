import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../app/clock.dart';
import '../../../../design/controls.dart';
import '../../../../design/money.dart';
import '../../../../design/quantity_stepper.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import '../../application/explore_controller.dart';
import '../../application/explore_results.dart';
import '../../domain/explore_query.dart';
import '../../domain/listing_category.dart';
import '../../domain/stay_search_policy.dart';
import '../../domain/stay_validation.dart';
import 'filter_sheet_frame.dart';

Future<void> showRentFiltersSheet(BuildContext context, ExploreQuery seed) => showListingSheet<void>(
      context,
      builder: (_) => _RentFiltersSheet(seed: seed),
    );

class _RentFiltersSheet extends ConsumerStatefulWidget {
  const _RentFiltersSheet({required this.seed});

  final ExploreQuery seed;

  @override
  ConsumerState<_RentFiltersSheet> createState() => _RentFiltersSheetState();
}

class _RentFiltersSheetState extends ConsumerState<_RentFiltersSheet> {
  static const _budgets = <int?>[null, 1000000, 2000000, 3500000, 5000000];
  static final _dayFormat = DateFormat('EEE, MMM d');

  RentMode? _mode;
  DateTimeRange? _dates;
  int _guests = 2;
  DateTime? _moveIn;
  int _occupants = 1;
  int? _maxPrice;
  late Set<QuickFilter> _features;
  String? _error;

  @override
  void initState() {
    super.initState();
    final query = ref.read(exploreQueryProvider(widget.seed));
    _mode = query.rentMode;
    _maxPrice = query.maxPriceCentavos;
    _features = {...query.quickFilters};
    switch (query.stay) {
      case ShortStaySearch(:final checkIn, :final checkOut, :final guests):
        _dates = DateTimeRange(start: checkIn, end: checkOut);
        _guests = guests;
      case MonthlySearch(:final moveIn, :final occupants):
        _moveIn = moveIn;
        _occupants = occupants;
      case null:
        break;
    }
  }

  Future<void> _pickDates() async {
    final now = ref.read(clockProvider)();
    final range = await showDateRangePicker(
      context: context,
      firstDate: StaySearchPolicy.firstBookableDay(now),
      lastDate: StaySearchPolicy.lastBookableDay(now),
      initialDateRange: _dates,
      helpText: 'Choose your stay',
    );
    if (range == null || !mounted) return;
    setState(() {
      _dates = range.end.isAfter(range.start)
          ? range
          : DateTimeRange(start: range.start, end: range.start.add(StaySearchPolicy.minimumStayLength));
      _error = null;
    });
  }

  Future<void> _pickMoveIn() async {
    final now = ref.read(clockProvider)();
    final picked = await showDatePicker(
      context: context,
      firstDate: StaySearchPolicy.firstBookableDay(now),
      lastDate: StaySearchPolicy.lastBookableDay(now),
      initialDate: _moveIn ?? StaySearchPolicy.defaultMoveIn(now),
      helpText: 'Move-in date',
    );
    if (picked == null || !mounted) return;
    setState(() {
      _moveIn = picked;
      _error = null;
    });
  }

  void _reset() => setState(() {
        _mode = null;
        _dates = null;
        _moveIn = null;
        _guests = 2;
        _occupants = 1;
        _maxPrice = null;
        _features = {};
        _error = null;
      });

  ExploreQuery _draftQuery(ExploreQuery current) {
    final dates = _dates;
    final moveIn = _moveIn;
    StaySearch? stay;
    if (_mode == RentMode.shortStay && dates != null) {
      stay = ShortStaySearch(checkIn: dates.start, checkOut: dates.end, guests: _guests);
    } else if (_mode == RentMode.monthly && moveIn != null) {
      stay = MonthlySearch(moveIn: moveIn, occupants: _occupants);
    }
    return ExploreQuery(
      intent: current.intent,
      category: current.category,
      text: current.text,
      area: current.area,
      sort: current.sort,
      rentMode: _mode,
      stay: stay,
      maxPriceCentavos: _maxPrice,
      quickFilters: _features,
    );
  }

  void _apply() {
    final now = ref.read(clockProvider)();
    final dates = _dates;
    final moveIn = _moveIn;
    StaySearch? stay;
    if (_mode == RentMode.shortStay && dates != null) {
      _error = StayValidation.shortStay(checkIn: dates.start, checkOut: dates.end, guests: _guests, now: now);
      stay = ShortStaySearch(checkIn: dates.start, checkOut: dates.end, guests: _guests);
    } else if (_mode == RentMode.monthly && moveIn != null) {
      _error = StayValidation.monthly(moveIn: moveIn, occupants: _occupants, now: now);
      stay = MonthlySearch(moveIn: moveIn, occupants: _occupants);
    }
    if (_error != null) {
      setState(() {});
      return;
    }
    final current = ref.read(exploreQueryProvider(widget.seed));
    ref.read(exploreQueryProvider(widget.seed).notifier).replace(
          ExploreQuery(
            intent: current.intent,
            category: current.category,
            text: current.text,
            area: current.area,
            sort: current.sort,
            rentMode: _mode,
            stay: stay,
            maxPriceCentavos: _maxPrice,
            quickFilters: _features,
          ),
        );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final current = ref.watch(exploreQueryProvider(widget.seed));
    final draft = _draftQuery(current);
    final count = ref.watch(exploreMatchCountProvider(draft)).valueOrNull;
    final applyLabel = count != null ? 'Show $count properties' : 'Show results';
    return FilterSheetFrame(
      title: 'Filters',
      onReset: _reset,
      onApply: _apply,
      applyLabel: applyLabel,
      children: [
        FilterSection(
          title: 'Type of stay',
          subtitle: 'Choose how you plan to stay.',
          child: FilterOptionRow<RentMode?>(
            options: const [null, RentMode.shortStay, RentMode.monthly],
            labelFor: (mode) => mode?.label ?? 'Any',
            isSelected: (mode) => mode == _mode,
            onTap: (mode) => setState(() {
              _mode = mode;
              _error = null;
            }),
          ),
        ),
        if (_mode == RentMode.shortStay)
          FilterSection(
            title: 'Dates and guests',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppPickerField(
                  label: 'Check-in → check-out',
                  value: _dates == null
                      ? 'Any dates'
                      : '${_dayFormat.format(_dates!.start)}  ${_dayFormat.format(_dates!.end)}',
                  icon: Icons.date_range_outlined,
                  onTap: _pickDates,
                ),
                if (_dates != null) ...[
                  const SizedBox(height: Tokens.s8),
                  QuantityStepper(
                    label: 'Guests',
                    value: _guests,
                    min: OccupancyLimits.minGuests,
                    max: OccupancyLimits.maxGuests,
                    compact: true,
                    onChanged: (value) => setState(() => _guests = value),
                  ),
                ],
              ],
            ),
          ),
        if (_mode == RentMode.monthly)
          FilterSection(
            title: 'Move-in',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppPickerField(
                  label: 'Move-in date',
                  value: _moveIn == null ? 'Any move-in date' : _dayFormat.format(_moveIn!),
                  icon: Icons.event_outlined,
                  onTap: _pickMoveIn,
                ),
                if (_moveIn != null) ...[
                  const SizedBox(height: Tokens.s8),
                  QuantityStepper(
                    label: 'Occupants',
                    value: _occupants,
                    min: OccupancyLimits.minGuests,
                    max: OccupancyLimits.maxGuests,
                    compact: true,
                    onChanged: (value) => setState(() => _occupants = value),
                  ),
                ],
              ],
            ),
          ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: Tokens.s16),
            child: Text(_error!, style: AppText.caption.copyWith(color: Tokens.taken)),
          ),
        FilterSection(
          title: 'Budget',
          subtitle: 'Select your preferred budget.',
          child: FilterChoiceWrap<int?>(
            options: _budgets,
            labelFor: (budget) => budget == null ? 'Any' : 'Under ${Money.peso(budget)}',
            isSelected: (budget) => budget == _maxPrice,
            onTap: (budget) => setState(() => _maxPrice = budget),
          ),
        ),
        FilterSection(
          title: 'Features',
          subtitle: 'Select the features you need.',
          divider: false,
          child: FilterFeatureGrid<QuickFilter>(
            options: QuickFilter.forIntent(MarketIntent.rent),
            labelFor: (filter) => filter.label,
            iconFor: (filter) => filter.icon,
            isSelected: _features.contains,
            onTap: (filter) => setState(() {
              if (!_features.remove(filter)) _features.add(filter);
            }),
          ),
        ),
      ],
    );
  }
}
