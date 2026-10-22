import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../features/application/domain/verification.dart';
import '../features/application/domain/verification_repository.dart';
import 'api_client.dart';
import 'listing_repository.dart';

class ApiVerificationRepository implements VerificationRepository {
  ApiVerificationRepository(this._api);
  final ApiClient _api;
  @override
  Future<ApplicationDraft?> findDraft(String resourceId) async {
    final json = await _api.getJson('/application-drafts/resource/$resourceId');
    final draft = json['draft'] as Map<String, dynamic>?;
    return draft == null ? null : ApplicationDraft.fromJson(draft);
  }

  @override
  Future<ApplicationDraft> saveDraft(
          {required String resourceId,
          required DateTime moveIn,
          required int occupants,
          required int termMonths,
          required String message}) async =>
      ApplicationDraft.fromJson(await _api.sendJson('POST', '/application-drafts', body: {
        'resourceId': resourceId,
        'desiredMoveIn': _day(moveIn),
        'desiredTermMonths': termMonths,
        'occupants': occupants,
        'message': message,
      }));
  Future<VerificationSession> _post(String path, [Map<String, dynamic>? body]) async =>
      VerificationSession.fromJson(await _api.sendJson('POST', path, body: body));
  @override
  Future<VerificationSession> resume(String draftId) => _post('/identity-verifications', {'draftId': draftId});
  @override
  Future<VerificationSession> status(String id) async =>
      VerificationSession.fromJson(await _api.getJson('/identity-verifications/$id'));
  @override
  Future<VerificationSession> consent(String id) =>
      _post('/identity-verifications/$id/consent', {'version': 'identity-v1', 'accepted': true});
  @override
  Future<VerificationSession> captureFront(
          String id, String captureId, Uint8List image, IdentityDetails extracted, Map<String, double> confidence) =>
      _post('/identity-verifications/$id/front', {
        'captureId': captureId,
        'extracted': extracted.toJson(),
        'ocrConfidence': confidence,
        'imageBase64': base64Encode(image)
      });
  @override
  Future<VerificationSession> confirmDetails(String id, IdentityDetails details) =>
      _post('/identity-verifications/$id/details', details.toJson());
  @override
  Future<VerificationSession> prepareChallenge(String id) => _post('/identity-verifications/$id/challenge');
  @override
  Future<VerificationSession> captureFace(VerificationSession session, String evidenceId, Uint8List image) =>
      _post('/identity-verifications/${session.id}/face', {
        'challengeId': session.challengeId,
        'instruction': session.instruction!.wire,
        'evidenceId': evidenceId,
        'imageBase64': base64Encode(image)
      });
  @override
  Future<VerificationSession> cancel(String id) => _post('/identity-verifications/$id/cancel');
  static String _day(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}

final verificationRepositoryProvider =
    Provider<VerificationRepository>((ref) => ApiVerificationRepository(ref.watch(apiClientProvider)));
