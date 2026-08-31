import '../../domain/value_objects/night_status.value_object.dart';

/// DTO for raw night availability items.
class NightAvailabilityDto {
  const NightAvailabilityDto({
    required this.night,
    required this.status,
  });

  factory NightAvailabilityDto.fromJson(Map<String, dynamic> json) {
    final statusStr = json['status'] as String? ?? 'BLOCKED';
    final status = switch (statusStr.toUpperCase()) {
      'OPEN' => NightStatus.open,
      'HELD' => NightStatus.held,
      'BOOKED' => NightStatus.booked,
      'LEASED' => NightStatus.leased,
      _ => NightStatus.blocked,
    };

    return NightAvailabilityDto(
      night: DateTime.parse(json['night'] as String),
      status: status,
    );
  }

  final DateTime night;
  final NightStatus status;
}
