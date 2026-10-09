import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/clock.dart';
import '../domain/explore_query.dart';
import '../domain/listing_category.dart';
import '../domain/stay_search_policy.dart';
import '../domain/stay_validation.dart';
import 'stay_search_state.dart';

typedef StaySearchArgs = ({ListingCategory? category, RentMode? mode});

class StaySearchController extends AutoDisposeFamilyNotifier<StaySearchState, StaySearchArgs> {
  @override
  StaySearchState build(StaySearchArgs args) => _initial(args);

  StaySearchState _initial(StaySearchArgs args) {
    final now = ref.read(clockProvider)();
    final modes = args.category?.rentModes ?? RentMode.values;
    return StaySearchState(
      category: args.category,
      modes: modes,
      mode: StaySearchPolicy.initialMode(modes, args.mode),
      checkIn: StaySearchPolicy.defaultCheckIn(now),
      checkOut: StaySearchPolicy.defaultCheckOut(now),
      moveIn: StaySearchPolicy.defaultMoveIn(now),
      guests: StaySearchPolicy.defaultGuests,
      occupants: StaySearchPolicy.defaultOccupants,
      firstBookableDay: StaySearchPolicy.firstBookableDay(now),
      lastBookableDay: StaySearchPolicy.lastBookableDay(now),
    );
  }

  void setMode(RentMode mode) {
    if (!state.modes.contains(mode) || mode == state.mode) return;
    state = state.copyWith(mode: mode, clearError: true);
  }

  void setShortStayDates(DateTime checkIn, DateTime checkOut) {
    final start = StayValidation.day(checkIn);
    final end = StayValidation.day(checkOut);
    state = state.copyWith(
      checkIn: start,
      checkOut: end.isAfter(start) ? end : start.add(StaySearchPolicy.minimumStayLength),
      clearError: true,
    );
  }

  void setMoveIn(DateTime moveIn) => state = state.copyWith(moveIn: StayValidation.day(moveIn), clearError: true);

  void setGuests(int guests) => state = state.copyWith(guests: _clamp(guests), clearError: true);

  void setOccupants(int occupants) => state = state.copyWith(occupants: _clamp(occupants), clearError: true);

  ExploreQuery? search() {
    final now = ref.read(clockProvider)();
    final error = state.isShortStay
        ? StayValidation.shortStay(checkIn: state.checkIn, checkOut: state.checkOut, guests: state.guests, now: now)
        : StayValidation.monthly(moveIn: state.moveIn, occupants: state.occupants, now: now);
    if (error != null) {
      state = state.copyWith(validationError: error);
      return null;
    }
    state = state.copyWith(clearError: true);
    return state.query;
  }

  void resetSearch() => state = _initial((category: state.category, mode: state.mode));

  static int _clamp(int value) => value.clamp(OccupancyLimits.minGuests, OccupancyLimits.maxGuests);
}

final staySearchProvider = NotifierProvider.autoDispose
    .family<StaySearchController, StaySearchState, StaySearchArgs>(StaySearchController.new);
