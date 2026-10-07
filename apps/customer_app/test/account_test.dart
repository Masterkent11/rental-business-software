import 'dart:async';
import 'dart:convert';

import 'package:customer_app/data/account_repository.dart';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/auth_repository.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/features/saved/saved_controller.dart';
import 'package:customer_app/fixtures/view_models.dart' show BookingStatus;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class _FakeAuth implements AuthGateway {
  _FakeAuth({String? token}) : _token = token;

  String? _token;
  final _controller = StreamController<void>.broadcast();

  @override
  String? get accessToken => _token;

  @override
  Stream<void> get changes => _controller.stream;

  void signIn(String token) {
    _token = token;
    _controller.add(null);
  }

  @override
  Future<void> signOut() async {
    _token = null;
    _controller.add(null);
  }

  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async => signIn('token-for-$email');

  @override
  Future<void> signUpWithPassword({
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> sendMobileOtp(String mobile) async {}

  @override
  Future<void> verifyMobileOtp({
    required String mobile,
    required String code,
  }) async => signIn('token-for-$mobile');
}

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
    final auth = _FakeAuth(token: 'the-token');
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
      auth: _FakeAuth(),
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
      auth: _FakeAuth(token: 't'),
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
      auth: _FakeAuth(token: 'stale'),
      client: MockClient((_) async => _json({'title': 'Unauthorized'}, 401)),
    );

    expect(await container.read(accountProvider.future), isNull);
  });

  group('stays', _staysTests);

  group('saved listings', () {
    test('are empty when signed out, and never guessed locally', () async {
      final container = containerWith(
        auth: _FakeAuth(),
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
        auth: _FakeAuth(token: 't'),
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
          auth: _FakeAuth(token: 't'),
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
        auth: _FakeAuth(token: 't'),
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
      final auth = _FakeAuth();
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

void _staysTests() {
  test('reads the receipt the server sends, deriving none of it', () async {
    final container = containerWith(
      auth: _FakeAuth(token: 't'),
      client: MockClient(
        (_) async => _json({
          'stays': [
            {
              'id': 's-1',
              'reference': 'D7C5BBA7',
              'listingTitle': 'Bunk near USC',
              'propertyName': 'Villa Boarding House',
              'areaLabel': 'Brgy. Sambag II',
              'cityLabel': 'Cebu City',
              'startsOn': '2027-11-01',
              'endsOn': '2027-11-04',
              'nights': 3,
              'paidCentavos': 135000,
              'paidAt': '2027-10-01T08:00:00.000Z',
              'state': 'CONFIRMED',
              'photo': 'https://example.test/a.jpg',
              'stateLabel': 'Confirmed',
              'bucket': 'ACTIVE',
            },
          ],
        }),
      ),
    );

    final stays = await container.read(staysProvider.future);
    final stay = stays.single;

    expect(stay.reference, 'D7C5BBA7');
    expect(stay.nights, 3);
    expect(stay.paidCentavos, 135000);
    expect(stay.isPaid, isTrue);
    expect(stay.stateLabel, 'Confirmed');
    expect(stay.bucket, BookingStatus.active);
  });

  test('takes the tab from the server, not from the dates', () async {
    final container = containerWith(
      auth: _FakeAuth(token: 't'),
      client: MockClient(
        (_) async => _json({
          'stays': [
            {
              'id': 's-2',
              'reference': 'AAAA1111',
              'listingTitle': 'Somewhere',
              'propertyName': 'P',
              'areaLabel': 'A',
              'cityLabel': 'C',
              'startsOn': '2099-01-01',
              'endsOn': '2099-01-03',
              'nights': 2,
              'paidCentavos': 1000,
              'paidAt': '2027-10-01T08:00:00.000Z',
              'state': 'CANCELLED',
              'photo': null,
              'stateLabel': 'Cancelled',
              'bucket': 'CANCELLED',
            },
          ],
        }),
      ),
    );

    final stay = (await container.read(staysProvider.future)).single;
    expect(stay.bucket, BookingStatus.cancelled);
    expect(stay.stateLabel, 'Cancelled');
  });

  test('is empty when signed out', () async {
    final container = containerWith(
      auth: _FakeAuth(),
      client: MockClient((_) async => _json({'stays': <dynamic>[]})),
    );

    expect(await container.read(staysProvider.future), isEmpty);
  });

  test('an unpaid stay is not shown as paid', () async {
    final container = containerWith(
      auth: _FakeAuth(token: 't'),
      client: MockClient(
        (_) async => _json({
          'stays': [
            {
              'id': 's-3',
              'reference': 'BBBB2222',
              'listingTitle': 'Somewhere',
              'propertyName': 'P',
              'areaLabel': 'A',
              'cityLabel': 'C',
              'startsOn': '2027-11-01',
              'endsOn': '2027-11-02',
              'nights': 1,
              'paidCentavos': 0,
              'paidAt': null,
              'state': 'CONFIRMED',
              'photo': null,
              'stateLabel': 'Confirmed',
              'bucket': 'ACTIVE',
            },
          ],
        }),
      ),
    );

    expect((await container.read(staysProvider.future)).single.isPaid, isFalse);
  });
}
