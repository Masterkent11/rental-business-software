import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:customer_app/app/app.dart';
import 'package:customer_app/app/composition_root.dart';
import 'package:customer_app/core/domain/result/result.dart';
import 'package:customer_app/core/domain/value_objects/money.value_object.dart';
import 'package:customer_app/core/networking/api.config.dart';
import 'package:customer_app/features/account/ports/repositories/auth_repository.port.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'fixtures/sample_data.dart';
import 'fixtures/view_models.dart';

final _kTransparentImage = Uint8List.fromList(<int>[
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
  0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
  0x42, 0x60, 0x82,
]);

class _FakeHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) => _FakeHttpClient();
}

class _FakeHttpClient extends Fake implements HttpClient {
  @override
  bool autoUncompress = true;
  @override
  Duration? connectionTimeout;
  @override
  Duration idleTimeout = const Duration(seconds: 15);
  @override
  int? maxConnectionsPerHost;
  @override
  String? userAgent;

  @override
  void addCredentials(Uri url, String realm, HttpClientCredentials credentials) {}
  @override
  void close({bool force = false}) {}

  @override
  Future<HttpClientRequest> getUrl(Uri url) async => _FakeHttpClientRequest();
  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) async => _FakeHttpClientRequest();
}

class _FakeHttpClientRequest extends Fake implements HttpClientRequest {
  @override
  final HttpHeaders headers = _FakeHttpHeaders();

  @override
  Future<HttpClientResponse> close() async => _FakeHttpClientResponse();
}

class _FakeHttpHeaders extends Fake implements HttpHeaders {
  @override
  void add(String name, Object value, {bool preserveHeaderCase = false}) {}
  @override
  void set(String name, Object value, {bool preserveHeaderCase = false}) {}
}

class _FakeHttpClientResponse extends Fake implements HttpClientResponse {
  @override
  int get statusCode => 200;
  @override
  int get contentLength => _kTransparentImage.length;
  @override
  HttpClientResponseCompressionState get compressionState =>
      HttpClientResponseCompressionState.notCompressed;
  @override
  final HttpHeaders headers = _FakeHttpHeaders();

  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int> event)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) {
    return Stream<List<int>>.fromIterable([_kTransparentImage]).listen(
      onData,
      onError: onError,
      onDone: onDone,
      cancelOnError: cancelOnError,
    );
  }
}

Future<void> _settle(WidgetTester tester, [int steps = 5]) async {
  for (var i = 0; i < steps; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

Future<void> _pumpApp(WidgetTester tester) async {
  HttpOverrides.global = _FakeHttpOverrides();

  tester.view
    ..physicalSize = const Size(390, 844)
    ..devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);

  final client = _fakeTransport();

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(const _SignedInAuth()),
        httpClientProvider.overrideWithValue(client),
        apiConfigProvider.overrideWithValue(
          const ApiConfig(baseUrl: 'http://test'),
        ),
      ],
      child: const CustomerApp(),
    ),
  );
  await _settle(tester, 10);
}

class _SignedInAuth implements AuthRepository {
  const _SignedInAuth();

  @override
  String? get accessToken => 'test-token';

  @override
  Stream<void> get changes => const Stream<void>.empty();

  @override
  Future<Result<void>> signInWithPassword({
    required String email,
    required String password,
  }) async =>
      const Result.ok(null);

  @override
  Future<Result<void>> signUpWithPassword({
    required String email,
    required String password,
  }) async =>
      const Result.ok(null);

  @override
  Future<Result<void>> sendMobileOtp(String mobile) async =>
      const Result.ok(null);

  @override
  Future<Result<void>> verifyMobileOtp({
    required String mobile,
    required String code,
  }) async =>
      const Result.ok(null);

  @override
  Future<Result<void>> signOut() async => const Result.ok(null);
}

MockClient _fakeTransport() {
  Map<String, dynamic> encode(Listing l) => {
        'id': l.id,
        'resourceId': 'res-${l.id}',
        'title': l.title,
        'description': SampleData.detailById(l.id)?.description ?? '',
        'propertyName': l.propertyName,
        'areaLabel': l.areaLabel,
        'cityLabel': l.cityLabel,
        'kind': l.kind == ListingKind.shortTerm ? 'SHORT_TERM' : 'LONG_TERM',
        'resourceType': switch (l.resourceType) {
          ResourceType.room => 'ROOM',
          ResourceType.bedSpace => 'BED_SPACE',
          ResourceType.parking => 'PARKING',
          ResourceType.storage => 'STORAGE',
          ResourceType.unit => 'UNIT',
        },
        'priceCentavos': l.priceCentavos,
        'currency': 'PHP',
        'hasTour': l.hasTour,
        'sceneCount': l.sceneCount,
        'photos': l.photos,
        'availabilityLabel': l.availabilityLabel,
        'isAvailable': l.isAvailable,
        'isFeatured': l.isFeatured,
        'amenities': SampleData.detailById(l.id)?.amenities ?? const <String>[],
        'houseRules': SampleData.detailById(l.id)?.houseRules ?? const <String>[],
        'terms': SampleData.detailById(l.id)?.terms ?? const <String>[],
        'minStayNights': SampleData.detailById(l.id)?.minimumStayNights,
        'sharedFacilities':
            SampleData.detailById(l.id)?.sharedFacilities ?? const <String>[],
        'ownerName': SampleData.detailById(l.id)?.ownerName ?? '',
        'ownerVerified': SampleData.detailById(l.id)?.ownerVerified ?? false,
      };

  return MockClient((request) async {
    final segments = request.url.pathSegments;

    if (request.url.path == '/me') {
      return http.Response(
        jsonEncode({
          'id': 'u-1',
          'displayName': 'Test User',
          'primaryEmail': 'test@example.com',
          'capabilities': <dynamic>[],
        }),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    }

    if (request.url.path == '/applications') {
      return http.Response(
        jsonEncode([
          for (final a in SampleData.applications)
            {
              'id': a.id,
              'reference': a.reference,
              'status': switch (a.status) {
                ApplicationStatus.underReview => 'UNDER_REVIEW',
                ApplicationStatus.approved => 'APPROVED',
                ApplicationStatus.rejected => 'REJECTED',
                ApplicationStatus.withdrawn => 'WITHDRAWN',
                ApplicationStatus.submitted => 'SUBMITTED',
                ApplicationStatus.expired => 'EXPIRED',
              },
              'listingTitle': a.listingTitle,
              'propertyName': a.propertyName,
              'areaLabel': a.areaLabel,
              'cityLabel': '',
              'photo': a.photo,
              'monthlyRentCentavos': a.monthlyCentavos,
              'moveInCostCentavos': a.moveInCostCentavos,
              'desiredMoveIn': a.moveIn.toIso8601String().substring(0, 10),
              'desiredTermMonths': 12,
              'message': '',
              'rejectionReason': a.reason,
              'decidedAt': a.decidedAt?.toIso8601String(),
              'createdAt': a.submittedAt.toIso8601String(),
              'documents': a.documents,
              'holdExpiresAt': a.holdExpiresAt?.toIso8601String(),
            },
        ]),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    }

    if (request.url.path == '/occupancies/stays') {
      return http.Response(
        jsonEncode([
          for (final b in SampleData.bookings)
            {
              'id': b.id,
              'reference': b.reference,
              'listingTitle': b.listingTitle,
              'propertyName': b.propertyName,
              'areaLabel': b.areaLabel,
              'cityLabel': '',
              'startsOn': b.checkIn.toIso8601String().substring(0, 10),
              'endsOn': b.checkOut.toIso8601String().substring(0, 10),
              'nights': b.nights,
              'paidCentavos': b.totalCentavos,
              'paidAt': '2027-01-01T00:00:00.000Z',
              'state': b.status == BookingStatus.cancelled
                  ? 'CANCELLED'
                  : 'CONFIRMED',
              'photo': b.photo,
              'stateLabel': b.stateLabel ?? b.status.label,
              'bucket': switch (b.status) {
                BookingStatus.cancelled => 'CANCELLED',
                BookingStatus.past => 'PAST',
                BookingStatus.active => 'ACTIVE',
              },
            },
        ]),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    }

    if (segments.length == 3 &&
        segments[0] == 'tours' &&
        segments[1] == 'resource') {
      final resourceId = segments[2];
      final listingId = resourceId.replaceFirst('res-', '');
      final scenes = SampleData.scenesFor(listingId);
      return http.Response(
        jsonEncode({
          'id': 'tour-$listingId',
          'resourceId': resourceId,
          'entrySceneId': 'scene-0',
          'scenes': [
            for (final (i, scene) in scenes.indexed)
              {
                'id': 'scene-$i',
                'label': scene.label,
                'position': i,
                'previewUrl': scene.imageUrl,
                'thumbnailUrl': scene.imageUrl,
                'tileUrlTemplate': '/tiles/scene-$i/{level}/{x}/{y}',
                'tileLevels': 3,
                'hotspots': [
                  for (final (h, hotspot) in scene.hotspots.indexed)
                    {
                      'id': 'hs-$i-$h',
                      'kind': hotspot.kind == HotspotKind.navigation
                          ? 'NAVIGATION'
                          : 'INFO',
                      'yaw': (hotspot.x - 0.5) * 60,
                      'pitch': (0.5 - hotspot.y) * 30,
                      'label': hotspot.label ?? hotspot.note ?? '',
                      'targetSceneId': hotspot.targetScene == null
                          ? null
                          : 'scene-${hotspot.targetScene}',
                    },
                ],
              },
          ],
        }),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    }

    if (segments.length == 2 && segments[0] == 'listings') {
      final match = SampleData.cardById(segments[1]);
      if (match == null) {
        return http.Response(jsonEncode({'title': 'Listing not found'}), 404,
            headers: {'content-type': 'application/json; charset=utf-8'});
      }
      return http.Response(jsonEncode(encode(match)), 200,
          headers: {'content-type': 'application/json; charset=utf-8'});
    }

    // Listings search
    final q = request.url.queryParameters;
    var rows = SampleData.listings;
    if (q['kind'] != null) {
      final want = q['kind'] == 'SHORT_TERM'
          ? ListingKind.shortTerm
          : ListingKind.longTerm;
      rows = rows.where((l) => l.kind == want).toList();
    }
    if (q['hasTour'] == 'true') {
      rows = rows.where((l) => l.hasTour).toList();
    }
    return http.Response(
      jsonEncode(rows.map(encode).toList()),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
  });
}

Future<void> _openListing(WidgetTester tester, String title) async {
  final finder = find.text(title);
  await tester.tap(finder.first);
  await _settle(tester, 10);
}

void main() {
  setUpAll(() {
    HttpOverrides.global = _FakeHttpOverrides();
  });

  group('Money', () {
    test('formats centavos as whole pesos', () {
      expect(Money.formatPesos(850000), '₱8,500');
      expect(Money.formatPesos(3400000), '₱34,000');
      expect(Money.formatPesos(350000), '₱3,500');
    });

    test('keeps centavos when exactness matters', () {
      expect(Money.formatPesos(850050), '₱8,500.50');
    });
  });

  testWidgets('discovery leads with price', (tester) async {
    await _pumpApp(tester);

    expect(find.text('Discover'), findsOneWidget);
    expect(find.text('₱8,500'), findsWidgets);
  });

  testWidgets('a listing opens detail', (tester) async {
    await _pumpApp(tester);

    await _openListing(tester, 'One-bedroom corner unit with cross-ventilation');

    expect(find.text('About this place'), findsOneWidget);
    expect(find.text('Amenities'), findsOneWidget);
  });

  testWidgets('long-term listing navigates to apply', (tester) async {
    await _pumpApp(tester);

    await _openListing(tester, 'One-bedroom corner unit with cross-ventilation');
    expect(find.text('Apply now'), findsOneWidget);

    await tester.tap(find.text('Apply now'));
    await _settle(tester, 10);

    expect(find.text('Desired Move-In Date'), findsOneWidget);
  });

  testWidgets('the header opens notifications and messages', (tester) async {
    await _pumpApp(tester);

    await tester.tap(find.byTooltip('Notifications'));
    await _settle(tester, 10);
    expect(find.text('Notifications'), findsOneWidget);

    await tester.tap(find.byType(BackButton));
    await _settle(tester, 10);

    await tester.tap(find.byTooltip('Messages'));
    await _settle(tester, 10);
    expect(find.text('Messages'), findsOneWidget);
  });

  testWidgets('stays tab lists bookings', (tester) async {
    await _pumpApp(tester);

    await tester.tap(find.byIcon(Icons.hotel_outlined));
    await _settle(tester, 10);

    expect(find.text('My Stays'), findsOneWidget);
  });

  testWidgets('applications tab lists rental applications', (tester) async {
    await _pumpApp(tester);

    await tester.tap(find.byIcon(Icons.description_outlined));
    await _settle(tester, 10);

    expect(find.text('My Applications'), findsOneWidget);
  });
}
