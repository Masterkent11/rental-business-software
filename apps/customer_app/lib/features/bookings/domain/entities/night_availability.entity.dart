import '../value_objects/night_status.value_object.dart';

typedef NightView = ({DateTime night, NightStatus status});

/// Domain entity representing a night's availability status.
class NightAvailability {
  const NightAvailability({
    required this.night,
    required this.status,
  });

  final DateTime night;
  final NightStatus status;
}
