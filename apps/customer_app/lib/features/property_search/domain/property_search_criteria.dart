import 'lease_duration.dart';
import 'property_type.dart';
import 'rental_mode.dart';

sealed class PropertySearchCriteria {
  const PropertySearchCriteria({
    required this.propertyType,
    required this.location,
  });

  final PropertyType propertyType;
  final String location;

  RentalMode get rentalMode;
}

class ShortStaySearchCriteria extends PropertySearchCriteria {
  const ShortStaySearchCriteria({
    required super.propertyType,
    required super.location,
    required this.checkIn,
    required this.checkOut,
    required this.guests,
  });

  final DateTime checkIn;
  final DateTime checkOut;
  final int guests;

  @override
  RentalMode get rentalMode => RentalMode.shortStay;

  int get nights => checkOut.difference(checkIn).inDays;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ShortStaySearchCriteria &&
          runtimeType == other.runtimeType &&
          propertyType == other.propertyType &&
          location == other.location &&
          checkIn == other.checkIn &&
          checkOut == other.checkOut &&
          guests == other.guests;

  @override
  int get hashCode => Object.hash(
        propertyType,
        location,
        checkIn,
        checkOut,
        guests,
      );

  @override
  String toString() =>
      'ShortStaySearchCriteria(propertyType: $propertyType, location: $location, checkIn: $checkIn, checkOut: $checkOut, guests: $guests)';
}

class MonthlySearchCriteria extends PropertySearchCriteria {
  const MonthlySearchCriteria({
    required super.propertyType,
    required super.location,
    required this.moveInDate,
    required this.leaseDuration,
    required this.occupants,
  });

  final DateTime moveInDate;
  final LeaseDuration leaseDuration;
  final int occupants;

  @override
  RentalMode get rentalMode => RentalMode.monthly;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MonthlySearchCriteria &&
          runtimeType == other.runtimeType &&
          propertyType == other.propertyType &&
          location == other.location &&
          moveInDate == other.moveInDate &&
          leaseDuration == other.leaseDuration &&
          occupants == other.occupants;

  @override
  int get hashCode => Object.hash(
        propertyType,
        location,
        moveInDate,
        leaseDuration,
        occupants,
      );

  @override
  String toString() =>
      'MonthlySearchCriteria(propertyType: $propertyType, location: $location, moveInDate: $moveInDate, leaseDuration: $leaseDuration, occupants: $occupants)';
}
