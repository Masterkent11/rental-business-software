import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';

import '../../fixtures/view_models.dart';

/// What a customer is searching for.
///
/// **The shape of a search depends on the rental type**, which is why this is a
/// model rather than three date fields on a widget. A nightly stay asks for
/// check-in and check-out; a condo asks for a move-in date and a term; parking
/// will ask for a start date, a duration, and eventually a vehicle.
///
/// So the period is a **sealed type**, and the UI renders whichever variant the
/// mode declares. Adding parking later is a new [SearchPeriod] variant and a
/// new [SearchModeSpec] row — not a redesign.
///
/// Nothing here computes availability or price. Those belong to the server:
/// occupancy has exactly one source of truth and it is not in this app.

// ---------------------------------------------------------------- period

@immutable
sealed class SearchPeriod {
  const SearchPeriod();

  /// Whether enough has been chosen to search on.
  ///
  /// A period with nothing chosen is the cleared state — there is no separate
  /// "any dates" variant, because an empty range already means exactly that and
  /// a third case would have to be handled at every switch for no gain.
  bool get isSet;
}

/// Short-term: a half-open run of nights, `[checkIn, checkOut)`.
///
/// Half-open matches the domain exactly, so a checkout on the 29th leaves the
/// 29th bookable. Getting this wrong is the classic double-booking bug.
@immutable
class NightRange extends SearchPeriod {
  const NightRange({this.checkIn, this.checkOut});

  final DateTime? checkIn;
  final DateTime? checkOut;

  @override
  bool get isSet => checkIn != null && checkOut != null;

  int get nights => isSet ? checkOut!.difference(checkIn!).inDays : 0;

  /// Guards the one rule a two-ended picker must never break.
  bool get isValid =>
      checkIn == null || checkOut == null || checkOut!.isAfter(checkIn!);
}

/// Long-term: a start date and a term in months.
///
/// Used by units, rooms, and bed spaces today. Parking and storage will use the
/// same variant, which is why it is named for the shape and not for "lease".
@immutable
class TermFrom extends SearchPeriod {
  const TermFrom({this.startDate, this.months});

  final DateTime? startDate;
  final int? months;

  @override
  bool get isSet => startDate != null;
}

// ------------------------------------------------------------- occupancy

/// Who and how much is being asked for.
///
/// Kept generic on purpose. `units` is rooms for a boarding house, a slot count
/// for parking, and almost always 1 for a whole unit — the *noun* comes from
/// the mode spec, so the model never has to know what it is renting.
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

// ------------------------------------------------------------------ mode

/// The rental shapes search can take.
///
/// V1 ships two. `parking` is declared but not offered in the picker yet — it
/// is here so the spec table below is visibly extensible rather than
/// theoretically extensible.
enum SearchMode { stay, monthly, parking }

/// Which fields a mode asks for, and what to call them.
///
/// **The UI reads this. It never hardcodes a label or a field.** That is the
/// contract that lets a new rental type arrive without touching the widget.
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

  /// True for a two-ended night range, false for a start date plus a term.
  final bool usesNightRange;

  final String occupancyLabel;
  final String personNoun;
  final String unitNoun;

  /// Children are a hotel idea. A boarding house asks for occupants.
  final bool showsChildren;

  /// How this mode narrows the existing discovery filters.
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

  /// Declared, not yet offered. Adding it to [offered] is the entire change.
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

  /// What the picker shows today.
  static const offered = [stay, monthly];

  static SearchModeSpec of(SearchMode mode) => switch (mode) {
        SearchMode.stay => stay,
        SearchMode.monthly => monthly,
        SearchMode.parking => parking,
      };
}

// -------------------------------------------------------------- criteria

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

  /// Always the shape the mode declares — see [withMode].
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

  /// Switching mode resets the period, because a night range is not a term and
  /// silently reinterpreting one as the other is how a customer ends up
  /// searching for something they did not ask for.
  SearchCriteria withMode(SearchMode next) => copyWith(
        mode: next,
        period: SearchModeSpec.of(next).usesNightRange
            ? const NightRange()
            : const TermFrom(),
        occupancy: SearchModeSpec.of(next).showsChildren
            ? occupancy
            : occupancy.copyWith(children: 0),
      );

  /// Human summary of the period, in this mode's vocabulary.
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
