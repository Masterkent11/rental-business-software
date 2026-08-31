import '../../domain/entities/night_availability.entity.dart';

abstract interface class AvailabilityRepository {
  Future<List<NightAvailability>> nights({
    required String resourceId,
    required DateTime from,
    required DateTime to,
  });
  Future<List<NightAvailability>> getAvailability({
    required String resourceId,
    required DateTime from,
    required DateTime to,
  });
}
