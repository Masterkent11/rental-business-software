import '../../domain/entities/tour.entity.dart';

abstract interface class TourRepository {
  Future<Tour?> tourForResource(String resourceId);
  Future<Tour?> getTourForResource(String resourceId);
}
