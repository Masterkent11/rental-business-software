import 'dart:convert';

import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/application_repository.dart';
import 'package:customer_app/fixtures/view_models.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

ApplicationRepository repositoryReturning(
  Object body, {
  int status = 200,
  void Function(http.Request request)? onRequest,
}) {
  final client = MockClient((request) async {
    onRequest?.call(request);
    return http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
  });
  return ApplicationRepository(
    ApiClient(client: client, baseUrl: 'http://test'),
  );
}

Map<String, dynamic> application({
  String state = 'SUBMITTED',
  String? decisionReason,
  Map<String, dynamic>? reservation,
  int? moveInCostCentavos = 3400000,
}) =>
    {
      'id': 'a-1',
      'reference': 'AB12CD34',
      'state': state,
      'listingTitle': 'One-bedroom corner unit',
      'propertyName': 'ABC Apartment',
      'areaLabel': 'Brgy. Kamputhaw',
      'cityLabel': 'Cebu City',
      'photo': 'https://example.test/a.jpg',
      'monthlyRentCentavos': 850000,
      'moveInCostCentavos': moveInCostCentavos,
      'desiredMoveIn': '2029-06-01',
      'desiredTermMonths': 12,
      'message': '',
      'decisionReason': decisionReason,
      'decidedAt': decisionReason == null ? null : '2029-05-01T00:00:00.000Z',
      'createdAt': '2029-04-01T00:00:00.000Z',
      'documentCount': 1,
      'documentNames': ['id.jpg'],
      'reservation': reservation,
    };

void main() {
  test('maps every state the server can send', () async {
    const pairs = {
      'SUBMITTED': ApplicationStatus.submitted,
      'UNDER_REVIEW': ApplicationStatus.underReview,
      'APPROVED': ApplicationStatus.approved,
      'REJECTED': ApplicationStatus.rejected,
      'WITHDRAWN': ApplicationStatus.withdrawn,
      'EXPIRED': ApplicationStatus.expired,
    };

    for (final entry in pairs.entries) {
      final repo = repositoryReturning({
        'applications': [application(state: entry.key)],
      });
      final view = (await repo.mine()).single;
      expect(view.status, entry.value, reason: entry.key);
    }
  });

  test('carries the rejection reason through', () async {
    final repo = repositoryReturning({
      'applications': [
        application(
          state: 'REJECTED',
          decisionReason: 'Let to an earlier applicant',
        ),
      ],
    });

    final view = (await repo.mine()).single;
    expect(view.reason, 'Let to an earlier applicant');
    expect(view.decidedAt, isNotNull);
  });

  test('shows the move-in cost only once approved', () async {
    final pending = repositoryReturning({
      'applications': [application(state: 'UNDER_REVIEW')],
    });
    expect((await pending.mine()).single.moveInCostCentavos, isNull);

    final approved = repositoryReturning({
      'applications': [application(state: 'APPROVED')],
    });
    expect((await approved.mine()).single.moveInCostCentavos, 3400000);
  });

  test('reads the reservation deadline from the server', () async {
    final repo = repositoryReturning({
      'applications': [
        application(
          state: 'APPROVED',
          reservation: {
            'state': 'ACTIVE',
            'feeCentavos': 200000,
            'expiresAt': '2029-05-08T00:00:00.000Z',
          },
        ),
      ],
    });

    final view = (await repo.mine()).single;
    expect(view.holdExpiresAt, DateTime.parse('2029-05-08T00:00:00.000Z'));
  });

  test('has no deadline when nothing was reserved', () async {
    final repo = repositoryReturning({
      'applications': [application()],
    });
    expect((await repo.mine()).single.holdExpiresAt, isNull);
  });

  test('sends the move-in date as a padded ISO day', () async {
    String? body;
    final repo = repositoryReturning({
      'id': 'a-1',
    }, onRequest: (request) => body = request.body);

    await repo.submit(
      resourceId: 'r-1',
      desiredMoveIn: DateTime(2029, 1, 5),
      desiredTermMonths: 12,
    );

    expect(jsonDecode(body!)['desiredMoveIn'], '2029-01-05');
  });

  test('a missing application is absence, not an error', () async {
    final repo = repositoryReturning({
      'title': 'No such application',
    }, status: 404);
    expect(await repo.byId('a-1'), isNull);
  });
}
