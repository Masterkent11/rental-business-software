import 'dart:convert';

import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/booking_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

BookingRepository repositoryReturning(
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
  return BookingRepository(
    ApiClient(client: client, baseUrl: 'http://test'),
  );
}

void main() {
  group('placeHold', () {
    test('parses the hold the server returns', () async {
      final repo = repositoryReturning({
        'id': 'occ-1',
        'resourceId': 'res-1',
        'state': 'HELD',
        'startsOn': '2029-01-05',
        'endsOn': '2029-01-08',
        'nights': 3,
        'expiresAt': '2029-01-01T01:00:00.000Z',
      });

      final hold = await repo.placeHold(
        resourceId: 'res-1',
        startsOn: DateTime(2029, 1, 5),
        endsOn: DateTime(2029, 1, 8),
      );

      expect(hold.id, 'occ-1');
      expect(hold.resourceId, 'res-1');
      expect(hold.nights, 3);
      expect(hold.expiresAt, DateTime.parse('2029-01-01T01:00:00.000Z'));
    });

    test('sends the dates as padded ISO days', () async {
      String? body;
      final repo = repositoryReturning(
        {
          'id': 'occ-1',
          'resourceId': 'res-1',
          'state': 'HELD',
          'startsOn': '2029-01-05',
          'endsOn': '2029-01-08',
          'nights': 3,
          'expiresAt': null,
        },
        onRequest: (request) => body = request.body,
      );

      await repo.placeHold(
        resourceId: 'res-1',
        startsOn: DateTime(2029, 1, 5),
        endsOn: DateTime(2029, 1, 8),
      );

      final sent = jsonDecode(body!) as Map<String, dynamic>;
      expect(sent['startsOn'], '2029-01-05');
      expect(sent['endsOn'], '2029-01-08');
    });

    test('a conflict is a 409, not swallowed', () async {
      final repo = repositoryReturning({'title': 'Taken'}, status: 409);

      await expectLater(
        repo.placeHold(
          resourceId: 'res-1',
          startsOn: DateTime(2029, 1, 5),
          endsOn: DateTime(2029, 1, 8),
        ),
        throwsA(
            isA<ApiException>().having((e) => e.statusCode, 'statusCode', 409)),
      );
    });

    test('a busy server is a 503, not a generic failure', () async {
      final repo = repositoryReturning({'title': 'Busy'}, status: 503);

      await expectLater(
        repo.placeHold(
          resourceId: 'res-1',
          startsOn: DateTime(2029, 1, 5),
          endsOn: DateTime(2029, 1, 8),
        ),
        throwsA(
            isA<ApiException>().having((e) => e.statusCode, 'statusCode', 503)),
      );
    });
  });

  group('startPaymentIntent', () {
    test('parses the intent without surfacing a redirect url', () async {
      final repo = repositoryReturning({
        'paymentId': 'pay-1',
        'amountCentavos': 450000,
        'nights': 3,
        'redirectUrl': 'https://sandbox.invalid/pay/whatever',
      });

      final intent = await repo.startPaymentIntent('occ-1');

      expect(intent.paymentId, 'pay-1');
      expect(intent.amountCentavos, 450000);
      expect(intent.nights, 3);
    });

    test('a gone hold is a 404', () async {
      final repo = repositoryReturning({'title': 'Gone'}, status: 404);

      await expectLater(
        repo.startPaymentIntent('occ-1'),
        throwsA(isA<ApiException>()
            .having((e) => e.isNotFound, 'isNotFound', isTrue)),
      );
    });
  });

  group('confirmSandboxPayment', () {
    test('parses the confirmation', () async {
      final repo = repositoryReturning({'applied': true, 'stayId': 's-1'});

      final result = await repo.confirmSandboxPayment(
        occupancyId: 'occ-1',
        paymentId: 'pay-1',
      );

      expect(result.applied, isTrue);
      expect(result.stayId, 's-1');
    });

    test('sends the payment id in the body', () async {
      String? body;
      final repo = repositoryReturning(
        {'applied': true, 'stayId': 's-1'},
        onRequest: (request) => body = request.body,
      );

      await repo.confirmSandboxPayment(
          occupancyId: 'occ-1', paymentId: 'pay-1');

      expect(jsonDecode(body!)['paymentId'], 'pay-1');
    });

    test('a payment that is not this caller\'s, or is gone, is a 404',
        () async {
      final repo = repositoryReturning({'title': 'Not found'}, status: 404);

      await expectLater(
        repo.confirmSandboxPayment(occupancyId: 'occ-1', paymentId: 'pay-1'),
        throwsA(isA<ApiException>()
            .having((e) => e.isNotFound, 'isNotFound', isTrue)),
      );
    });
  });
}
