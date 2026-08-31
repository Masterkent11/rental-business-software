import '../../../../core/networking/api.client.dart';
import '../../domain/entities/night_availability.entity.dart';
import '../../ports/repositories/availability_repository.port.dart';
import '../dto/availability.dto.dart';
import '../mappers/availability.mapper.dart';

class AvailabilityRepositoryAdapter implements AvailabilityRepository {
  AvailabilityRepositoryAdapter(this._api);

  final ApiClient _api;

  @override
  Future<List<NightAvailability>> nights({
    required String resourceId,
    required DateTime from,
    required DateTime to,
  }) async {
    final body = await _api.getJson(
      '/resources/$resourceId/availability',
      query: {
        'from': _formatDay(from),
        'to': _formatDay(to),
      },
    );

    final raw = (body['nights'] as List<dynamic>? ?? const []);
    return raw
        .whereType<Map>()
        .map((json) => NightAvailabilityDto.fromJson(Map<String, dynamic>.from(json)).toDomain())
        .toList(growable: false);
  }

  @override
  Future<List<NightAvailability>> getAvailability({
    required String resourceId,
    required DateTime from,
    required DateTime to,
  }) =>
      nights(resourceId: resourceId, from: from, to: to);

  static String _formatDay(DateTime day) {
    final y = day.year.toString().padLeft(4, '0');
    final m = day.month.toString().padLeft(2, '0');
    final d = day.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }
}

typedef AvailabilityRepositoryImpl = AvailabilityRepositoryAdapter;
