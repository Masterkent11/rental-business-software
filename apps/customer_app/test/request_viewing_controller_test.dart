import 'dart:convert';

import 'package:customer_app/app/clock.dart';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/auth_repository.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/data/viewing_repository.dart';
import 'package:customer_app/features/viewing/request_viewing_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'support/fake_auth.dart';

Map<String, dynamic> _response(Map<String, dynamic> body, {String status = 'REQUESTED'}) => {
      'viewingRequest': {
        'id': 'viewing-1',
        'listingId': 'sale-1',
        'listingTitle': 'House',
        'listingPhoto': null,
        'areaLabel': 'Talamban',
        'cityLabel': 'Cebu City',
        'organizationName': 'Santos Realty',
        'agentName': 'Jun Reyes',
        'conversationId': 'conv-1',
        'preferredDate': body['preferredDate'],
        'preferredTimeWindow': body['preferredTimeWindow'],
        'scheduledAt': null,
        'status': status,
        'customerNote': '',
        'partnerNote': '',
        'agentChangeNotice': null,
        'updatedAt': '2026-10-08T02:00:00.000Z',
      },
      'assignmentState': 'ASSIGNED',
      'assignedAgent': {
        'id': 'agent-1',
        'displayName': 'Jun Reyes',
        'role': 'Property specialist',
        'photoUrl': null,
        'verified': false,
        'organizationName': 'Santos Realty',
      },
    };

ProviderContainer _container(List<http.Request> requests) {
  final client = ApiClient(
    client: MockClient((request) async {
      requests.add(request);
      final body = request.body.isEmpty ? <String, dynamic>{} : jsonDecode(request.body) as Map<String, dynamic>;
      await Future<void>.delayed(const Duration(milliseconds: 5));
      return http.Response(jsonEncode(_response(body)), 200, headers: {'content-type': 'application/json'});
    }),
    baseUrl: 'http://test',
  );
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(FakeAuth.signedIn()),
      apiClientProvider.overrideWithValue(client),
      clockProvider.overrideWithValue(() => DateTime.utc(2026, 10, 8, 2)),
      viewingStepMinimumProvider.overrideWithValue(Duration.zero),
      viewingReconcileIntervalProvider.overrideWithValue(const Duration(hours: 1)),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

void main() {
  const key = (listingId: 'sale-1', rescheduleId: null);

  test('the form needs a date and an open window; closed windows are not submittable', () {
    final container = _container([]);
    final sub = container.listen(requestViewingControllerProvider(key), (_, __) {});
    final controller = container.read(requestViewingControllerProvider(key).notifier);
    expect(sub.read().selectedDay, DateTime.utc(2026, 10, 8));
    expect(sub.read().canSubmit, isFalse);
    controller.selectWindow(ViewingTimeWindow.afternoon);
    expect(sub.read().canSubmit, isTrue);
    controller.updateNote('x' * 301);
    expect(sub.read().canSubmit, isFalse);
  });

  test('a double tap sends one request and the state walks the real phases to sent', () async {
    final requests = <http.Request>[];
    final container = _container(requests);
    final uis = <RequestViewingUiState>[];
    container.listen(requestViewingControllerProvider(key), (_, next) => uis.add(next.ui));
    final controller = container.read(requestViewingControllerProvider(key).notifier)
      ..selectWindow(ViewingTimeWindow.evening);
    await Future.wait([controller.submit(), controller.submit()]);
    expect(requests.where((r) => r.method == 'POST'), hasLength(1));
    expect(uis.where((u) => u != RequestViewingUiState.form).toList(), [
      RequestViewingUiState.submitting,
      RequestViewingUiState.matching,
      RequestViewingUiState.pendingConfirmation,
    ]);
    final state = container.read(requestViewingControllerProvider(key));
    expect(state.result?.agent?.displayName, 'Jun Reyes');
    expect(state.result?.agent?.verified, isFalse);
  });

  test('rescheduling sends a new preference through the customer action, never an agent id', () async {
    final requests = <http.Request>[];
    final container = _container(requests);
    const reschedule = (listingId: 'sale-1', rescheduleId: 'viewing-1');
    container.listen(requestViewingControllerProvider(reschedule), (_, __) {});
    final controller = container.read(requestViewingControllerProvider(reschedule).notifier)
      ..selectDay(DateTime.utc(2026, 10, 10))
      ..selectWindow(ViewingTimeWindow.morning);
    await controller.submit();
    final sent = requests.singleWhere((r) => r.method == 'POST');
    expect(sent.url.path, '/me/viewings/viewing-1/action');
    final body = jsonDecode(sent.body) as Map<String, dynamic>;
    expect(
        body, {'action': 'RESCHEDULE', 'preferredDate': '2026-10-10', 'preferredTimeWindow': 'MORNING', 'note': null});
  });
}
