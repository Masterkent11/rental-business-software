import '../../domain/entities/rental_application.entity.dart';
import '../../domain/value_objects/application_submission.value_object.dart';

abstract interface class ApplicationRepository {
  Future<List<RentalApplication>> mine();
  Future<RentalApplication?> byId(String id);
  Future<String> submit({
    required String resourceId,
    required DateTime desiredMoveIn,
    int? desiredTermMonths,
    String? notes,
    List<String> documentPaths = const [],
  });
  Future<void> withdraw(String id);
  Future<({String occupancyId, int feeCentavos})> reserve(String id);

  Future<List<RentalApplication>> getMyApplications();
  Future<RentalApplication?> getById(String id);
  Future<String> submitApplication(ApplicationSubmission submission);
}
