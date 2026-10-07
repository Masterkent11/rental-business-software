import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/listing_repository.dart';
import '../../../fixtures/view_models.dart';
import '../domain/lease_duration.dart';
import '../domain/property_search_criteria.dart';
import '../domain/property_type.dart';
import '../domain/rental_mode.dart';
import 'property_search_repository.dart';
import 'search_properties.dart';
import 'validate_search_criteria.dart';

final propertySearchRepositoryProvider =
    Provider<PropertySearchRepository>((ref) {
  return ref.watch(listingRepositoryProvider);
});

final searchPropertiesUseCaseProvider = Provider<SearchProperties>((ref) {
  final repository = ref.watch(propertySearchRepositoryProvider);
  return SearchProperties(repository);
});

final propertyResultsProvider = FutureProvider.autoDispose
    .family<List<ListingCardView>, PropertySearchCriteria>((ref, criteria) async {
  final useCase = ref.watch(searchPropertiesUseCaseProvider);
  return useCase(criteria);
});

class PropertySearchFormState {
  const PropertySearchFormState({
    required this.propertyType,
    this.location = 'Cebu City',
    this.mode = RentalMode.shortStay,
    this.checkIn,
    this.checkOut,
    this.guests = 2,
    this.moveInDate,
    this.leaseDuration = LeaseDuration.sixMonths,
    this.occupants = 2,
    this.validationError,
  });

  final PropertyType propertyType;
  final String location;
  final RentalMode mode;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final int guests;
  final DateTime? moveInDate;
  final LeaseDuration leaseDuration;
  final int occupants;
  final String? validationError;

  PropertySearchFormState copyWith({
    PropertyType? propertyType,
    String? location,
    RentalMode? mode,
    DateTime? checkIn,
    DateTime? checkOut,
    int? guests,
    DateTime? moveInDate,
    LeaseDuration? leaseDuration,
    int? occupants,
    String? validationError,
    bool clearValidationError = false,
  }) {
    return PropertySearchFormState(
      propertyType: propertyType ?? this.propertyType,
      location: location ?? this.location,
      mode: mode ?? this.mode,
      checkIn: checkIn ?? this.checkIn,
      checkOut: checkOut ?? this.checkOut,
      guests: guests ?? this.guests,
      moveInDate: moveInDate ?? this.moveInDate,
      leaseDuration: leaseDuration ?? this.leaseDuration,
      occupants: occupants ?? this.occupants,
      validationError: clearValidationError
          ? null
          : (validationError ?? this.validationError),
    );
  }

  PropertySearchCriteria? buildCriteria({DateTime? now}) {
    if (mode == RentalMode.shortStay) {
      final error = ValidateSearchCriteria.validateShortStay(
        checkIn: checkIn,
        checkOut: checkOut,
        guests: guests,
        now: now,
      );
      if (error != null) return null;
      return ShortStaySearchCriteria(
        propertyType: propertyType,
        location: location.trim().isEmpty ? 'Cebu City' : location.trim(),
        checkIn: checkIn!,
        checkOut: checkOut!,
        guests: guests,
      );
    } else {
      final error = ValidateSearchCriteria.validateMonthly(
        moveInDate: moveInDate,
        occupants: occupants,
        now: now,
      );
      if (error != null) return null;
      return MonthlySearchCriteria(
        propertyType: propertyType,
        location: location.trim().isEmpty ? 'Cebu City' : location.trim(),
        moveInDate: moveInDate!,
        leaseDuration: leaseDuration,
        occupants: occupants,
      );
    }
  }
}

class PropertySearchFormController
    extends StateNotifier<PropertySearchFormState> {
  PropertySearchFormController(PropertyType initialType)
      : super(PropertySearchFormState(
          propertyType: initialType,
          checkIn: DateTime.now().add(const Duration(days: 7)),
          checkOut: DateTime.now().add(const Duration(days: 9)),
          moveInDate: DateTime.now().add(const Duration(days: 14)),
        ));

  void setLocation(String location) {
    state = state.copyWith(location: location, clearValidationError: true);
  }

  void setMode(RentalMode mode) {
    state = state.copyWith(mode: mode, clearValidationError: true);
  }

  void setDates({required DateTime? checkIn, required DateTime? checkOut}) {
    state = state.copyWith(
      checkIn: checkIn,
      checkOut: checkOut,
      clearValidationError: true,
    );
  }

  void setGuests(int guests) {
    state = state.copyWith(guests: guests, clearValidationError: true);
  }

  void setMoveInDate(DateTime? moveInDate) {
    state = state.copyWith(
      moveInDate: moveInDate,
      clearValidationError: true,
    );
  }

  void setLeaseDuration(LeaseDuration duration) {
    state = state.copyWith(
      leaseDuration: duration,
      clearValidationError: true,
    );
  }

  void setOccupants(int occupants) {
    state = state.copyWith(
      occupants: occupants,
      clearValidationError: true,
    );
  }

  PropertySearchCriteria? submit({DateTime? now}) {
    final criteria = state.buildCriteria(now: now);
    if (criteria == null) {
      final error = state.mode == RentalMode.shortStay
          ? ValidateSearchCriteria.validateShortStay(
              checkIn: state.checkIn,
              checkOut: state.checkOut,
              guests: state.guests,
              now: now,
            )
          : ValidateSearchCriteria.validateMonthly(
              moveInDate: state.moveInDate,
              occupants: state.occupants,
              now: now,
            );
      state = state.copyWith(validationError: error);
      return null;
    }
    return criteria;
  }
}

final propertySearchFormProvider = StateNotifierProvider.autoDispose
    .family<PropertySearchFormController, PropertySearchFormState, PropertyType>(
  (ref, type) => PropertySearchFormController(type),
);
