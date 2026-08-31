import '../../domain/value_objects/application_submission.value_object.dart';
import '../../ports/repositories/application_repository.port.dart';

class SubmitApplicationUseCase {
  const SubmitApplicationUseCase(this._repo);
  final ApplicationRepository _repo;

  Future<String> call({
    required String resourceId,
    required DateTime desiredMoveIn,
    int? desiredTermMonths,
    String? notes,
    List<String> documentPaths = const [],
  }) =>
      _repo.submit(
        resourceId: resourceId,
        desiredMoveIn: desiredMoveIn,
        desiredTermMonths: desiredTermMonths,
        notes: notes,
        documentPaths: documentPaths,
      );

  Future<String> execute(ApplicationSubmission submission) =>
      _repo.submit(
        resourceId: submission.resourceId,
        desiredMoveIn: submission.desiredMoveIn,
        desiredTermMonths: submission.desiredTermMonths,
        notes: submission.message,
        documentPaths: submission.documentPaths,
      );
}
