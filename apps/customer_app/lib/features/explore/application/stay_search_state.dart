import 'package:flutter/foundation.dart';

import '../domain/explore_query.dart';
import '../domain/listing_category.dart';

@immutable
class StaySearchState {
  const StaySearchState({
    required this.category,
    required this.modes,
    required this.mode,
    required this.checkIn,
    required this.checkOut,
    required this.moveIn,
    required this.guests,
    required this.occupants,
    required this.firstBookableDay,
    required this.lastBookableDay,
    this.validationError,
  });

  final ListingCategory? category;
  final List<RentMode> modes;
  final RentMode mode;
  final DateTime checkIn;
  final DateTime checkOut;
  final DateTime moveIn;
  final int guests;
  final int occupants;
  final DateTime firstBookableDay;
  final DateTime lastBookableDay;
  final String? validationError;

  bool get isShortStay => mode == RentMode.shortStay;

  bool get offersModeChoice => modes.length > 1;

  StaySearch get stay => isShortStay
      ? ShortStaySearch(checkIn: checkIn, checkOut: checkOut, guests: guests)
      : MonthlySearch(moveIn: moveIn, occupants: occupants);

  ExploreQuery get query => ExploreQuery(category: category, rentMode: mode, stay: stay);

  StaySearchState copyWith({
    RentMode? mode,
    DateTime? checkIn,
    DateTime? checkOut,
    DateTime? moveIn,
    int? guests,
    int? occupants,
    String? validationError,
    bool clearError = false,
  }) =>
      StaySearchState(
        category: category,
        modes: modes,
        mode: mode ?? this.mode,
        checkIn: checkIn ?? this.checkIn,
        checkOut: checkOut ?? this.checkOut,
        moveIn: moveIn ?? this.moveIn,
        guests: guests ?? this.guests,
        occupants: occupants ?? this.occupants,
        firstBookableDay: firstBookableDay,
        lastBookableDay: lastBookableDay,
        validationError: clearError ? null : (validationError ?? this.validationError),
      );
}
