import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:customer_app/app/clock.dart';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/application_repository.dart';
import 'package:customer_app/data/verification_repository.dart';
import 'package:customer_app/features/application/application_controller.dart';
import 'package:customer_app/features/application/domain/verification.dart';
import 'package:customer_app/features/application/domain/verification_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class MemoryVerification implements VerificationRepository {
  ApplicationDraft? draft;
  VerificationStatus serverStatus = VerificationStatus.frontReady;
  ApiException? findFailure;
  ApiException? saveFailure;
  ApiException? resumeFailure;
  Completer<ApplicationDraft?>? findGate;
  int saves = 0;
  int statusReads = 0;
  Completer<ApplicationDraft>? saveGate;
  VerificationSession session(VerificationStatus status) =>
      VerificationSession(id: 's1', draftId: 'd1', status: status, expiresAt: DateTime(2099), version: statusReads);
  @override
  Future<ApplicationDraft?> findDraft(String resourceId) async {
    if (findFailure != null) throw findFailure!;
    return findGate == null ? draft : await findGate!.future;
  }

  @override
  Future<ApplicationDraft> saveDraft(
      {required String resourceId,
      required DateTime moveIn,
      required int occupants,
      required int termMonths,
      required String message}) async {
    saves++;
    if (saveFailure != null) throw saveFailure!;
    draft = ApplicationDraft(
        id: 'd1',
        resourceId: resourceId,
        moveIn: moveIn,
        termMonths: termMonths,
        occupants: occupants,
        message: message);
    return saveGate == null ? draft! : await saveGate!.future;
  }

  @override
  Future<VerificationSession> resume(String draftId) async {
    if (resumeFailure != null) throw resumeFailure!;
    return session(serverStatus);
  }

  @override
  Future<VerificationSession> status(String id) async {
    statusReads++;
    return session(serverStatus);
  }

  @override
  Future<VerificationSession> consent(String id) async => session(serverStatus = VerificationStatus.frontReady);
  @override
  Future<VerificationSession> captureFront(String id, String captureId, Uint8List image, IdentityDetails extracted,
          Map<String, double> confidence) async =>
      session(serverStatus = VerificationStatus.ocrReview);
  @override
  Future<VerificationSession> confirmDetails(String id, IdentityDetails details) async =>
      session(serverStatus = VerificationStatus.detailsConfirmed);
  @override
  Future<VerificationSession> prepareChallenge(String id) async =>
      session(serverStatus = VerificationStatus.challengeActive);
  @override
  Future<VerificationSession> captureFace(VerificationSession s, String evidenceId, Uint8List image) async =>
      session(serverStatus = VerificationStatus.verifying);
  @override
  Future<VerificationSession> cancel(String id) async => session(serverStatus = VerificationStatus.cancelled);
}

void main() {
  Future<({ProviderContainer container, MemoryVerification server, List<http.Request> requests})> setup() async {
    final server = MemoryVerification();
    final requests = <http.Request>[];
    final api = ApiClient(
        baseUrl: 'http://test',
        client: MockClient((request) async {
          requests.add(request);
          return http.Response(jsonEncode({'id': 'application-1', 'state': 'SUBMITTED'}), 201);
        }));
    final container = ProviderContainer(overrides: [
      verificationRepositoryProvider.overrideWithValue(server),
      applicationRepositoryProvider.overrideWithValue(ApplicationRepository(api)),
      clockProvider.overrideWithValue(() => DateTime(2026, 10, 21))
    ]);
    final subscription = container.listen(applicationFlowProvider('r1'), (previous, next) {});
    addTearDown(() {
      subscription.close();
      container.dispose();
      api.close();
    });
    await Future<void>.delayed(Duration.zero);
    return (container: container, server: server, requests: requests);
  }

  test('retains draft inputs when returning from verification', () async {
    final env = await setup();
    final controller = env.container.read(applicationFlowProvider('r1').notifier);
    controller.edit(occupants: 3, message: 'Moving with family', moveIn: DateTime(2026, 11, 3));
    await controller.continueToVerification();
    controller.backToDetails();
    final state = env.container.read(applicationFlowProvider('r1'));
    expect(state.occupants, 3);
    expect(state.message, 'Moving with family');
    expect(state.moveIn, DateTime(2026, 11, 3));
    expect(env.server.draft!.occupants, 3);
    expect(env.requests, isEmpty);
  });
  test('requires authoritative verification, then review, then explicit submit', () async {
    final env = await setup();
    final controller = env.container.read(applicationFlowProvider('r1').notifier);
    await controller.continueToVerification();
    await controller.refresh();
    controller.finishVerificationPresentation();
    expect(env.container.read(applicationFlowProvider('r1')).step, ApplicationStep.verification);
    env.server.serverStatus = VerificationStatus.verified;
    await controller.refresh();
    expect(env.requests, isEmpty);
    expect(env.container.read(applicationFlowProvider('r1')).step, ApplicationStep.verification);
    controller.finishVerificationPresentation();
    expect(env.container.read(applicationFlowProvider('r1')).step, ApplicationStep.review);
    expect(env.requests, isEmpty);
    await controller.submit();
    expect(env.requests, hasLength(1));
    expect(jsonDecode(env.requests.single.body)['draftId'], 'd1');
    expect(env.container.read(applicationFlowProvider('r1')).applicationId, 'application-1');
    await controller.submit();
    expect(env.requests, hasLength(1));
  });
  test('revalidates expiration before final submission', () async {
    final env = await setup();
    final controller = env.container.read(applicationFlowProvider('r1').notifier);
    env.server.serverStatus = VerificationStatus.verified;
    await controller.continueToVerification();
    await controller.refresh();
    controller.finishVerificationPresentation();
    env.server.serverStatus = VerificationStatus.expired;
    await controller.submit();
    expect(env.requests, isEmpty);
    expect(env.container.read(applicationFlowProvider('r1')).step, ApplicationStep.verification);
  });
  test('blocks repeated continue taps while saving', () async {
    final env = await setup();
    final controller = env.container.read(applicationFlowProvider('r1').notifier);
    env.server.saveGate = Completer<ApplicationDraft>();
    final first = controller.continueToVerification();
    await controller.continueToVerification();
    expect(env.server.saves, 1);
    env.server.saveGate!.complete(env.server.draft!);
    await first;
  });
  test('invalid form does not create a draft', () async {
    final env = await setup();
    final controller = env.container.read(applicationFlowProvider('r1').notifier);
    controller.edit(moveIn: DateTime(2000));
    await controller.continueToVerification();
    expect(env.server.saves, 0);
    expect(env.container.read(applicationFlowProvider('r1')).error, isNotNull);
  });
  for (final failure in [
    const ApiException('Could not reach the server. Check your connection and try again.', isNetwork: true),
    const ApiException('The server took too long to respond. Please try again.', isTimeout: true),
    const ApiException('The service is busy right now. Please try again.', statusCode: 503),
    const ApiException('Your session expired. Please sign in again.', statusCode: 401),
  ]) {
    test('save failure retains inputs and permits retry: ${failure.message}', () async {
      final env = await setup();
      final controller = env.container.read(applicationFlowProvider('r1').notifier);
      controller.edit(occupants: 4, moveIn: DateTime(2026, 11, 4));
      env.server.saveFailure = failure;
      await controller.continueToVerification();
      final state = env.container.read(applicationFlowProvider('r1'));
      expect(state.step, ApplicationStep.details);
      expect(state.error, failure.message);
      expect(state.occupants, 4);
      expect(state.moveIn, DateTime(2026, 11, 4));
      expect(state.busy, false);
      expect(env.requests, isEmpty);
      env.server.saveFailure = null;
      await controller.continueToVerification();
      expect(env.container.read(applicationFlowProvider('r1')).step, ApplicationStep.verification);
    });
  }
  test('verification initialization failure permits retry without submitting', () async {
    final env = await setup();
    final controller = env.container.read(applicationFlowProvider('r1').notifier);
    env.server.resumeFailure = const ApiException('Please try again.', statusCode: 503);
    await controller.continueToVerification();
    expect(env.container.read(applicationFlowProvider('r1')).step, ApplicationStep.details);
    expect(env.requests, isEmpty);
    env.server.resumeFailure = null;
    await controller.continueToVerification();
    expect(env.container.read(applicationFlowProvider('r1')).step, ApplicationStep.verification);
    expect(env.requests, isEmpty);
  });
  test('confirming OCR details automatically starts the face challenge', () async {
    final env = await setup();
    final controller = env.container.read(applicationFlowProvider('r1').notifier);
    await controller.continueToVerification();
    await controller.confirm(const IdentityDetails(
        fullName: 'Ana Santos', dateOfBirth: '1990-01-01', documentType: 'Passport', documentNumber: 'TEST-123'));
    expect(env.container.read(applicationFlowProvider('r1')).session!.status, VerificationStatus.challengeActive);
    expect(env.requests, isEmpty);
  });
  test('restores saved inputs without marking initialization busy', () async {
    final server = MemoryVerification()..findGate = Completer<ApplicationDraft?>();
    final api = ApiClient(baseUrl: 'http://test');
    addTearDown(api.close);
    final controller =
        ApplicationFlowController(server, ApplicationRepository(api), 'r1', () => DateTime(2026, 10, 21));
    addTearDown(controller.dispose);
    expect(controller.state.busy, false);
    server.findGate!.complete(ApplicationDraft(
        id: 'd1', resourceId: 'r1', moveIn: DateTime(2026, 11, 4), termMonths: 12, occupants: 3, message: ''));
    await Future<void>.delayed(Duration.zero);
    expect(controller.state.occupants, 3);
    expect(controller.state.moveIn, DateTime(2026, 11, 4));
    expect(controller.state.loading, false);
  });
  test('late restoration does not overwrite edited inputs', () async {
    final server = MemoryVerification()..findGate = Completer<ApplicationDraft?>();
    final api = ApiClient(baseUrl: 'http://test');
    addTearDown(api.close);
    final controller =
        ApplicationFlowController(server, ApplicationRepository(api), 'r1', () => DateTime(2026, 10, 21));
    addTearDown(controller.dispose);
    controller.edit(occupants: 4);
    server.findGate!.complete(ApplicationDraft(
        id: 'd1', resourceId: 'r1', moveIn: DateTime(2026, 11, 4), termMonths: 12, occupants: 2, message: ''));
    await Future<void>.delayed(Duration.zero);
    expect(controller.state.occupants, 4);
  });
  test('restoration failure is recoverable', () async {
    final server = MemoryVerification()..findFailure = const ApiException('Service unavailable', statusCode: 503);
    final api = ApiClient(baseUrl: 'http://test');
    addTearDown(api.close);
    final controller =
        ApplicationFlowController(server, ApplicationRepository(api), 'r1', () => DateTime(2026, 10, 21));
    addTearDown(controller.dispose);
    await Future<void>.delayed(Duration.zero);
    expect(controller.state.error, 'Service unavailable');
    expect(controller.state.loading, false);
    server.findFailure = null;
    await controller.restore();
    expect(controller.state.error, isNull);
  });
  for (final occupants in [0, 51]) {
    test('rejects occupant count $occupants before making a request', () async {
      final env = await setup();
      final controller = env.container.read(applicationFlowProvider('r1').notifier);
      controller.edit(occupants: occupants);
      await controller.continueToVerification();
      expect(env.server.saves, 0);
      expect(env.container.read(applicationFlowProvider('r1')).step, ApplicationStep.details);
      expect(env.requests, isEmpty);
    });
  }
  test('disposing during a save does not update dead state', () async {
    final server = MemoryVerification();
    final api = ApiClient(baseUrl: 'http://test');
    addTearDown(api.close);
    final controller =
        ApplicationFlowController(server, ApplicationRepository(api), 'r1', () => DateTime(2026, 10, 21));
    await Future<void>.delayed(Duration.zero);
    server.saveGate = Completer<ApplicationDraft>();
    final first = controller.continueToVerification();
    controller.dispose();
    server.saveGate!.complete(server.draft!);
    await first;
  });
}
