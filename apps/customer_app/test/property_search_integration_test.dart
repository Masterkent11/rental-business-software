import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:customer_app/app/app.dart';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/auth_repository.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/data/tour_repository.dart';
import 'package:customer_app/features/discovery/widgets/listing_card.dart';
import 'package:customer_app/fixtures/sample_data.dart';
import 'package:customer_app/fixtures/view_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void _ignoreOfflineImages() {
  final original = FlutterError.onError;
  FlutterError.onError = (details) {
    if (details.exception is NetworkImageLoadException) return;
    original?.call(details);
  };
  addTearDown(() => FlutterError.onError = original);
}

Future<ui.Image> _pixel() {
  final completer = Completer<ui.Image>();
  ui.decodeImageFromPixels(
    Uint8List.fromList(const [40, 60, 90, 255]),
    1,
    1,
    ui.PixelFormat.rgba8888,
    completer.complete,
  );
  return completer.future;
}

class _TestAuth implements AuthGateway {
  const _TestAuth();

  @override
  String? get accessToken => 'test-token';

  @override
  Stream<void> get changes => const Stream<void>.empty();

  @override
  Future<void> signInWithPassword({
    required String email,
    required String password,
  }) async {}

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
  }) async {}

  @override
  Future<void> signOut() async {}
}

MockClient _mockClient() {
  Map<String, dynamic> encode(ListingCardView l) => {
    'id': l.id,
    'resourceId': 'res-${l.id}',
    'title': l.title,
    'description': 'A beautiful space with all essentials.',
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
    'amenities': const <String>['WiFi', 'Aircon'],
    'terms': const <String>['No smoking'],
    'houseRules': const <String>['Quiet hours after 10PM'],
    'sharedFacilities': const <String>[],
    'minStayNights': 2,
    'ownerName': 'Host John',
    'ownerVerified': true,
  };

  return MockClient((request) async {
    final segments = request.url.pathSegments;
    if (segments.length == 2 && segments[0] == 'listings') {
      final match =
          SampleData.cardById(segments[1]) ??
          SampleData.listings.firstWhere(
            (l) => l.id == segments[1],
            orElse: () => SampleData.listings.first,
          );
      return http.Response(
        jsonEncode(encode(match)),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    }

    final q = request.url.queryParameters;
    var rows = SampleData.listings;
    if (q['kind'] != null) {
      final want = q['kind'] == 'SHORT_TERM'
          ? ListingKind.shortTerm
          : ListingKind.longTerm;
      rows = rows.where((l) => l.kind == want).toList();
    }
    return http.Response(
      jsonEncode({
        'items': rows.map(encode).toList(),
        'limit': 50,
        'offset': 0,
      }),
      200,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
  });
}

Future<void> _pumpApp(WidgetTester tester) async {
  final pixel = (await tester.runAsync(_pixel))!;
  _ignoreOfflineImages();

  tester.view
    ..physicalSize = const Size(390, 844)
    ..devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);

  final client = ApiClient(client: _mockClient(), baseUrl: 'http://test');

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(const _TestAuth()),
        panoramaImageLoaderProvider.overrideWithValue(
          (_) async => pixel.clone(),
        ),
        listingRepositoryProvider.overrideWithValue(ListingRepository(client)),
        apiClientProvider.overrideWithValue(client),
      ],
      child: const CustomerApp(showSplash: false),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'E2E Short Stay Happy Path: Launch -> Home -> Apartment -> Short Stay -> Dates -> Guests -> Search -> Results -> Property Details',
    (tester) async {
      await _pumpApp(tester);

      expect(find.text('Find your next place'), findsOneWidget);

      await tester.tap(find.text('Apartment'));
      await tester.pumpAndSettle();

      expect(find.text('Where do you want to stay?'), findsOneWidget);
      expect(find.text('Short stay'), findsWidgets);

      expect(find.text('Check in'), findsOneWidget);
      expect(find.text('Check out'), findsOneWidget);

      await tester.tap(find.text('Guests'));
      await tester.pumpAndSettle();

      expect(find.byType(BottomSheet), findsOneWidget);
      await tester.tap(find.byIcon(Icons.add));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Apply'));
      await tester.pumpAndSettle();

      expect(find.text('3'), findsOneWidget);

      final searchCta = find.text('Search Apartments');
      await tester.tap(searchCta);
      await tester.pumpAndSettle();

      expect(find.text('Apartments in Cebu City'), findsOneWidget);
      expect(find.textContaining('place'), findsOneWidget);

      final firstListing = find.byType(ListingCard).first;
      await tester.tap(firstListing);
      await tester.pumpAndSettle();

      expect(find.textContaining('ABC Apartment'), findsWidgets);
    },
  );

  testWidgets(
    'E2E Monthly Rental Path: Home -> Condo -> Monthly Rental -> Move-in -> Lease Duration -> Occupants -> Search -> Results',
    (tester) async {
      await _pumpApp(tester);

      await tester.tap(find.text('Condo'));
      await tester.pumpAndSettle();

      expect(find.text('Where do you want to stay?'), findsOneWidget);

      await tester.tap(find.text('Monthly rental'));
      await tester.pumpAndSettle();

      expect(find.text('Move in'), findsOneWidget);
      expect(find.text('Lease duration'), findsOneWidget);
      expect(find.text('Occupants'), findsOneWidget);

      await tester.tap(find.text('Lease duration'));
      await tester.pumpAndSettle();

      expect(find.text('12 months'), findsOneWidget);
      await tester.tap(find.text('12 months'));
      await tester.pumpAndSettle();

      expect(find.text('12 months'), findsOneWidget);

      await tester.tap(find.text('Occupants'));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.add));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Apply'));
      await tester.pumpAndSettle();

      expect(find.text('3'), findsOneWidget);

      final searchCta = find.text('Search Condos');
      await tester.tap(searchCta);
      await tester.pumpAndSettle();

      expect(find.text('Condos in Cebu City'), findsOneWidget);
      expect(find.textContaining('place'), findsOneWidget);
    },
  );
}
