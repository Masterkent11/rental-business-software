import '../../../../core/networking/api.client.dart';
import '../../../../core/networking/api.exception.dart';
import '../../domain/entities/tour.entity.dart';
import '../../ports/repositories/tour_repository.port.dart';
import '../dto/tour.dto.dart';
import '../mappers/tour.mapper.dart';

class TourRepositoryAdapter implements TourRepository {
  TourRepositoryAdapter(this._api);

  final ApiClient _api;

  @override
  Future<Tour?> tourForResource(String resourceId) async {
    try {
      final body = await _api.getJson('/resources/$resourceId/tour');
      return TourDto.fromJson(Map<String, dynamic>.from(body)).toDomain();
    } on ApiException catch (error) {
      if (error.isNotFound) return null;
      rethrow;
    }
  }

  @override
  Future<Tour?> getTourForResource(String resourceId) =>
      tourForResource(resourceId);
}

typedef TourRepositoryImpl = TourRepositoryAdapter;
