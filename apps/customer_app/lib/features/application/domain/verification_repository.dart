import 'dart:typed_data';
import 'verification.dart';

abstract interface class VerificationRepository {
  Future<ApplicationDraft?> findDraft(String resourceId);
  Future<ApplicationDraft> saveDraft(
      {required String resourceId,
      required DateTime moveIn,
      required int occupants,
      required int termMonths,
      required String message});
  Future<VerificationSession> resume(String draftId);
  Future<VerificationSession> status(String id);
  Future<VerificationSession> consent(String id);
  Future<VerificationSession> captureFront(
      String id, String captureId, Uint8List image, IdentityDetails extracted, Map<String, double> confidence);
  Future<VerificationSession> confirmDetails(String id, IdentityDetails details);
  Future<VerificationSession> prepareChallenge(String id);
  Future<VerificationSession> captureFace(VerificationSession session, String evidenceId, Uint8List image);
  Future<VerificationSession> cancel(String id);
}
