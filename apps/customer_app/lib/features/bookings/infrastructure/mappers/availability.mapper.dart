import '../../domain/entities/night_availability.entity.dart';
import '../dto/availability.dto.dart';

extension NightAvailabilityMapper on NightAvailabilityDto {
  NightView toDomainTuple() => (night: night, status: status);
  NightAvailability toDomain() => NightAvailability(night: night, status: status);
}
