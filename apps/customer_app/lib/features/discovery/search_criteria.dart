import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';

import '../../fixtures/view_models.dart';

@immutable
sealed class SearchPeriod {
  const SearchPeriod();

  bool get isSet;
}

@immutable
class NightRange extends SearchPeriod {
  const NightRange({this.checkIn, this.checkOut});

  final DateTime? checkIn;
  final DateTime? checkOut;

  @override
  bool get isSet => checkIn != null && checkOut != null;

  int get nights => isSet ? checkOut!.difference(checkIn!).inDays : 0;

  bool get isValid =>
      checkIn == null || checkOut == null || checkOut!.isAfter(checkIn!);
}

@immutable
class TermFrom extends SearchPeriod {
  const TermFrom({this.startDate, this.months});

  final DateTime? startDate;
  final int? months;

  @override
  bool get isSet => startDate != null;
}

@immutable
class Occupancy {
  const Occupancy({this.adults = 2, this.children = 0, this.units = 1});

  final int adults;
  final int children;
  final int units;

  int get people => adults + children;

  Occupancy copyWith({int? adults, int? children, int? units}) => Occupancy(
    adults: adults ?? this.adults,
    children: children ?? this.children,
    units: units ?? this.units,
  );
}

enum SearchMode { stay, monthly, parking }

@immutable
class SearchModeSpec {
  const SearchModeSpec({
    required this.mode,
    required this.tabLabel,
    required this.periodLabel,
    required this.startLabel,
    required this.endLabel,
    required this.usesNightRange,
    required this.occupancyLabel,
    required this.personNoun,
    required this.unitNoun,
    required this.showsChildren,
    required this.listingKind,
    this.resourceType,
  });

  final SearchMode mode;
  final String tabLabel;

  final String periodLabel;
  final String startLabel;
  final String endLabel;

  final bool usesNightRange;

  final String occupancyLabel;
  final String personNoun;
  final String unitNoun;

  final bool showsChildren;

  final ListingKind listingKind;
  final ResourceType? resourceType;

  static const stay = SearchModeSpec(
    mode: SearchMode.stay,
    tabLabel: 'Short stay',
    periodLabel: 'Dates',
    startLabel: 'Check-in',
    endLabel: 'Check-out',
    usesNightRange: true,
    occupancyLabel: 'Guests',
    personNoun: 'adult',
    unitNoun: 'room',
    showsChildren: true,
    listingKind: ListingKind.shortTerm,
  );

  static const monthly = SearchModeSpec(
    mode: SearchMode.monthly,
    tabLabel: 'Monthly rental',
    periodLabel: 'Move-in',
    startLabel: 'Move-in',
    endLabel: 'Duration',
    usesNightRange: false,
    occupancyLabel: 'Occupants',
    personNoun: 'occupant',
    unitNoun: 'unit',
    showsChildren: false,
    listingKind: ListingKind.longTerm,
  );

  static const parking = SearchModeSpec(
    mode: SearchMode.parking,
    tabLabel: 'Parking',
    periodLabel: 'From',
    startLabel: 'Start date',
    endLabel: 'Duration',
    usesNightRange: false,
    occupancyLabel: 'Slots',
    personNoun: 'vehicle',
    unitNoun: 'slot',
    showsChildren: false,
    listingKind: ListingKind.longTerm,
    resourceType: ResourceType.parking,
  );

  static const offered = [stay, monthly];

  static SearchModeSpec of(SearchMode mode) => switch (mode) {
    SearchMode.stay => stay,
    SearchMode.monthly => monthly,
    SearchMode.parking => parking,
  };
}

@immutable
class SearchCriteria {
  const SearchCriteria({
    this.destination = '',
    this.mode = SearchMode.stay,
    this.period = const NightRange(),
    this.occupancy = const Occupancy(),
  });

  final String destination;
  final SearchMode mode;

  final SearchPeriod period;
  final Occupancy occupancy;

  SearchModeSpec get spec => SearchModeSpec.of(mode);

  SearchCriteria copyWith({
    String? destination,
    SearchMode? mode,
    SearchPeriod? period,
    Occupancy? occupancy,
  }) {
    return SearchCriteria(
      destination: destination ?? this.destination,
      mode: mode ?? this.mode,
      period: period ?? this.period,
      occupancy: occupancy ?? this.occupancy,
    );
  }

  SearchCriteria withMode(SearchMode next) => copyWith(
    mode: next,
    period: SearchModeSpec.of(next).usesNightRange
        ? const NightRange()
        : const TermFrom(),
    occupancy: SearchModeSpec.of(next).showsChildren
        ? occupancy
        : occupancy.copyWith(children: 0),
  );

  String describePeriod() {
    final fmt = DateFormat('MMM d');
    return switch (period) {
      NightRange(:final checkIn, :final checkOut) when checkIn != null =>
        checkOut == null
            ? '${fmt.format(checkIn)} — add ${spec.endLabel.toLowerCase()}'
            : '${fmt.format(checkIn)} · ${fmt.format(checkOut)}',
      NightRange() => 'Add dates',
      TermFrom(:final startDate, :final months) when startDate != null =>
        months == null
            ? fmt.format(startDate)
            : '${fmt.format(startDate)} · $months months',
      TermFrom() => 'Add a move-in date',
    };
  }

  String describeOccupancy() {
    final s = spec;
    final people = s.showsChildren ? occupancy.adults : occupancy.people;
    final parts = <String>[
      '$people ${s.personNoun}${people == 1 ? "" : "s"}',
      if (s.showsChildren && occupancy.children > 0)
        '${occupancy.children} child${occupancy.children == 1 ? "" : "ren"}',
      '${occupancy.units} ${s.unitNoun}${occupancy.units == 1 ? "" : "s"}',
    ];
    return parts.join(' · ');
  }
}
