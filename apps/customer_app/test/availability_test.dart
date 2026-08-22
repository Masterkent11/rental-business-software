import 'dart:convert';

import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/availability_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

AvailabilityRepository repositoryReturning(
  Object body, {
  void Function(Uri uri)? onRequest,
}) {
  final client = MockClient((request) async {
    onRequest?.call(request.url);
    return http.Response(
      jsonEncode(body),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
  });
  return AvailabilityRepository(
    ApiClient(client: client, baseUrl: 'http://test'),
  );
}

void main() {
  test('asks for the window as a half-open range', () async {
    Uri? seen;
    final repo = repositoryReturning(
      {'nights': <dynamic>[]},
      onRequest: (uri) => seen = uri,
    );

    await repo.nights(
      resourceId: 'r-1',
      from: DateTime(2027, 3, 1),
      to: DateTime(2027, 4, 1),
    );

    expect(seen!.path, '/resources/r-1/availability');
    expect(seen!.queryParameters['from'], '2027-03-01');
    expect(seen!.queryParameters['to'], '2027-04-01');
  });

  test('maps the statuses the server sends', () async {
    final repo = repositoryReturning({
      'nights': [
        {'night': '2027-03-01', 'status': 'OPEN'},
        {'night': '2027-03-02', 'status': 'BOOKED'},
        {'night': '2027-03-03', 'status': 'LEASED'},
        {'night': '2027-03-04', 'status': 'HELD'},
        {'night': '2027-03-05', 'status': 'BLOCKED'},
      ],
    });

    final nights = await repo.nights(
      resourceId: 'r-1',
      from: DateTime(2027, 3, 1),
      to: DateTime(2027, 3, 6),
    );

    expect(nights.map((n) => n.status).toList(), [
      NightStatus.open,
      NightStatus.booked,
      NightStatus.leased,
      NightStatus.held,
      NightStatus.blocked,
    ]);
    // Only OPEN is offerable. A held night belongs to someone mid-checkout.
    expect(nights.where((n) => n.status.isTaken).length, 4);
  });

  test('treats an unknown status as taken, not as free', () async {
    // If the server grows a state this build has never heard of, offering the
    // night anyway risks selling something that is gone. Refusing it only
    // risks an unnecessary "not available".
    final repo = repositoryReturning({
      'nights': [
        {'night': '2027-03-01', 'status': 'UNDER_RENOVATION'},
      ],
    });

    final nights = await repo.nights(
      resourceId: 'r-1',
      from: DateTime(2027, 3, 1),
      to: DateTime(2027, 3, 2),
    );

    expect(nights.single.status.isTaken, isTrue);
  });

  test('pads single-digit months and days', () async {
    Uri? seen;
    final repo = repositoryReturning(
      {'nights': <dynamic>[]},
      onRequest: (uri) => seen = uri,
    );

    await repo.nights(
      resourceId: 'r-1',
      from: DateTime(2027, 1, 5),
      to: DateTime(2027, 2, 9),
    );

    // '2027-1-5' is not a date the API accepts, and the failure would look
    // like an empty calendar rather than an error.
    expect(seen!.queryParameters['from'], '2027-01-05');
    expect(seen!.queryParameters['to'], '2027-02-09');
  });
}
