import 'dart:convert';

import 'package:customer_app/data/account_repository.dart';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/auth_repository.dart';
import 'package:customer_app/data/booking_repository.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/features/saved/saved_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'support/fake_auth.dart';


ProviderContainer containerWith({
  required AuthGateway auth,
  required MockClient client,
}) {
  final container = ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(auth),
      apiClientProvider.overrideWith(
        (ref) => ApiClient(
          client: client,
          baseUrl: 'http://test',
          tokenSource: () => ref.read(authRepositoryProvider).accessToken,
        ),
      ),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

http.Response _json(Object body, [int status = 200]) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

void main() {
  test('sends the access token as a bearer header', () async {
    String? seenAuthorization;
    final auth = FakeAuth(token: 'the-token');
    final container = containerWith(
      auth: auth,
      client: MockClient((request) async {
        seenAuthorization = request.headers['Authorization'];
        return _json({
          'id': 'u-1',
          'displayName': 'Ana',
          'capabilities': <dynamic>[],
        });
      }),
    );

    await container.read(accountProvider.future);
    expect(seenAuthorization, 'Bearer the-token');
  });

  test('sends no Authorization header when signed out', () async {
    var called = false;
    final container = containerWith(
      auth: FakeAuth(),
      client: MockClient((request) async {
        called = true;
        return _json({});
      }),
    );

    expect(await container.read(accountProvider.future), isNull);
    expect(called, isFalse);
  });

  test('reads capabilities from the server, never from the token', () async {
    final container = containerWith(
      auth: FakeAuth(token: 't'),
      client: MockClient(
        (_) async => _json({
          'id': 'u-1',
          'displayName': 'Ana',
          'capabilities': [
            {'capability': 'CUSTOMER', 'organizationId': null},
            {'capability': 'TENANT', 'organizationId': null},
          ],
        }),
      ),
    );

    final account = await container.read(accountProvider.future);
    expect(account!.isTenant, isTrue);
    expect(account.isOwner, isFalse);
  });

  test('treats a rejected token as signed out, not as an error', () async {
    final container = containerWith(
      auth: FakeAuth(token: 'stale'),
      client: MockClient((_) async => _json({'title': 'Unauthorized'}, 401)),
    );

    expect(await container.read(accountProvider.future), isNull);
  });

  group('bookings', _bookingsTests);

  group('saved listings', () {
    test('are empty when signed out, and never guessed locally', () async {
      final container = containerWith(
        auth: FakeAuth(),
        client: MockClient(
          (_) async => _json({
            'listingIds': ['x'],
          }),
        ),
      );

      expect(await container.read(savedIdsProvider.future), isEmpty);
    });

    test('come from the account once signed in', () async {
      final container = containerWith(
        auth: FakeAuth(token: 't'),
        client: MockClient(
          (_) async => _json({
            'listingIds': ['c1111111-0000-0000-0000-000000000001'],
          }),
        ),
      );

      expect(await container.read(savedIdsProvider.future), {
        'c1111111-0000-0000-0000-000000000001',
      });
    });

    test(
      'show the change immediately, then take the server\'s answer',
      () async {
        const id = 'c1111111-0000-0000-0000-000000000001';
        final container = containerWith(
          auth: FakeAuth(token: 't'),
          client: MockClient((request) async {
            if (request.method == 'GET') {
              return _json({'listingIds': <String>[]});
            }
            return _json({
              'listingIds': [id],
            });
          }),
        );

        await container.read(savedIdsProvider.future);
        await container.read(savedIdsProvider.notifier).toggle(id);

        expect(container.read(savedIdsProvider).valueOrNull, {id});
      },
    );

    test('roll back when the server refuses', () async {
      const id = 'c1111111-0000-0000-0000-000000000001';
      final container = containerWith(
        auth: FakeAuth(token: 't'),
        client: MockClient((request) async {
          if (request.method == 'GET') return _json({'listingIds': <String>[]});
          return _json({'title': 'Nope'}, 500);
        }),
      );

      await container.read(savedIdsProvider.future);
      await expectLater(
        container.read(savedIdsProvider.notifier).toggle(id),
        throwsA(isA<ApiException>()),
      );

      expect(container.read(savedIdsProvider).valueOrNull, isEmpty);
    });

    test('are refetched after signing in', () async {
      const id = 'c1111111-0000-0000-0000-000000000001';
      final auth = FakeAuth();
      final container = containerWith(
        auth: auth,
        client: MockClient(
          (_) async => _json({
            'listingIds': [id],
          }),
        ),
      );

      expect(await container.read(savedIdsProvider.future), isEmpty);

      auth.signIn('t');
      await container.read(sessionProvider.future);
      container.invalidate(savedIdsProvider);

      expect(await container.read(savedIdsProvider.future), {id});
    });
  });
}

Map<String, dynamic> _booking({
  required String id,
  String bucket = 'UPCOMING',
  String statusLabel = 'Confirmed',
  int paidCentavos = 0,
  String? paidAt,
  String startsOn = '2027-11-01',
  String endsOn = '2027-11-04',
}) =>
    {
      'id': id,
      'reference': id.toUpperCase(),
      'listingId': 'l-1',
      'listingTitle': 'Bunk near USC',
      'propertyName': 'Villa Boarding House',
      'areaLabel': 'Brgy. Sambag II',
      'cityLabel': 'Cebu City',
      'photo': 'https://example.test/a.jpg',
      'guests': 2,
      'startsOn': startsOn,
      'endsOn': endsOn,
      'nights': 3,
      'bucket': bucket,
      'statusLabel': statusLabel,
      'paidCentavos': paidCentavos,
      'paidAt': paidAt,
      'holdExpiresAt': null,
      'conversationId': null,
    };

void _bookingsTests() {
  test('reads the receipt the server sends, deriving none of it', () async {
    final container = containerWith(
      auth: FakeAuth(token: 't'),
      client: MockClient((request) async {
        expect(request.url.path, '/me/bookings');
        return _json({
          'bookings': [
            _booking(
              id: 'd7c5bba7',
              paidCentavos: 135000,
              paidAt: '2027-10-01T08:00:00.000Z',
            ),
          ],
        });
      }),
    );

    final booking = (await container.read(myBookingsProvider.future)).single;

    expect(booking.reference, 'D7C5BBA7');
    expect(booking.nights, 3);
    expect(booking.paidCentavos, 135000);
    expect(booking.isPaid, isTrue);
    expect(booking.statusLabel, 'Confirmed');
    expect(booking.bucket, BookingBucket.upcoming);
    expect(booking.isActive, isTrue);
  });

  test('takes the tab from the server, not from the dates', () async {
    final container = containerWith(
      auth: FakeAuth(token: 't'),
      client: MockClient(
        (_) async => _json({
          'bookings': [
            _booking(
              id: 'aaaa1111',
              bucket: 'CANCELLED',
              statusLabel: 'Cancelled',
              startsOn: '2099-01-01',
              endsOn: '2099-01-03',
            ),
          ],
        }),
      ),
    );

    final booking = (await container.read(myBookingsProvider.future)).single;
    expect(booking.bucket, BookingBucket.cancelled);
    expect(booking.statusLabel, 'Cancelled');
    expect(booking.isActive, isFalse);
  });

  test('is empty when signed out, without calling the server', () async {
    var called = false;
    final container = containerWith(
      auth: FakeAuth(),
      client: MockClient((_) async {
        called = true;
        return _json({'bookings': <dynamic>[]});
      }),
    );

    expect(await container.read(myBookingsProvider.future), isEmpty);
    expect(called, isFalse);
  });

  test('treats a rejected token as signed out', () async {
    final container = containerWith(
      auth: FakeAuth(token: 'stale'),
      client: MockClient((_) async => _json({'title': 'Unauthorized'}, 401)),
    );

    expect(await container.read(myBookingsProvider.future), isEmpty);
  });

  test('an unpaid booking awaiting payment is not shown as paid', () async {
    final container = containerWith(
      auth: FakeAuth(token: 't'),
      client: MockClient(
        (_) async => _json({
          'bookings': [
            _booking(id: 'bbbb2222', bucket: 'PENDING_PAYMENT', statusLabel: 'Awaiting payment'),
          ],
        }),
      ),
    );

    final booking = (await container.read(myBookingsProvider.future)).single;
    expect(booking.isPaid, isFalse);
    expect(booking.bucket, BookingBucket.pendingPayment);
  });
}
