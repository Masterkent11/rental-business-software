import '../../../../core/networking/api.client.dart';
import '../../../../core/networking/api.exception.dart';
import '../../domain/entities/rental_application.entity.dart';
import '../../domain/value_objects/application_submission.value_object.dart';
import '../../ports/repositories/application_repository.port.dart';
import '../dto/application.dto.dart';
import '../mappers/application.mapper.dart';

class ApplicationRepositoryAdapter implements ApplicationRepository {
  ApplicationRepositoryAdapter(this._api);

  final ApiClient _api;

  @override
  Future<List<RentalApplication>> mine() async {
    final body = await _api.getJson('/me/applications');
    final raw = (body['applications'] as List<dynamic>? ?? const []);
    return raw
        .whereType<Map>()
        .map((json) => ApplicationDto.fromJson(Map<String, dynamic>.from(json)).toDomain())
        .toList(growable: false);
  }

  @override
  Future<RentalApplication?> byId(String id) async {
    try {
      final body = await _api.getJson('/applications/$id');
      return ApplicationDto.fromJson(Map<String, dynamic>.from(body)).toDomain();
    } on ApiException catch (error) {
      if (error.isNotFound) return null;
      rethrow;
    }
  }

  @override
  Future<String> submit({
    required String resourceId,
    required DateTime desiredMoveIn,
    int? desiredTermMonths,
    String? notes,
    List<String> documentPaths = const [],
  }) async {
    final body = await _api.postJson('/applications', {
      'resourceId': resourceId,
      'desiredMoveIn': desiredMoveIn.toIso8601String().split('T').first,
      if (desiredTermMonths != null) 'desiredTermMonths': desiredTermMonths,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
      if (documentPaths.isNotEmpty) 'documentPaths': documentPaths,
    });
    return body['id'] as String? ?? '';
  }

  @override
  Future<void> withdraw(String id) async {
    await _api.postJson('/applications/$id/withdraw', const {});
  }

  @override
  Future<({String occupancyId, int feeCentavos})> reserve(String id) async {
    final body = await _api.postJson('/applications/$id/reserve', const {});
    return (
      occupancyId: body['occupancyId'] as String? ?? '',
      feeCentavos: (body['feeCentavos'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  Future<List<RentalApplication>> getMyApplications() => mine();

  @override
  Future<RentalApplication?> getById(String id) => byId(id);

  @override
  Future<String> submitApplication(ApplicationSubmission submission) => submit(
        resourceId: submission.resourceId,
        desiredMoveIn: submission.desiredMoveIn,
        desiredTermMonths: submission.desiredTermMonths,
        notes: submission.message,
        documentPaths: submission.documentPaths,
      );
}

typedef ApplicationRepositoryImpl = ApplicationRepositoryAdapter;
