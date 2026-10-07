import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:customer_app/app/app.dart';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/auth_repository.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/data/tour_repository.dart';
import 'package:customer_app/fixtures/sample_data.dart';
import 'package:customer_app/fixtures/view_models.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:customer_app/design/money.dart';
import 'package:customer_app/features/bookings/widgets/empty_bookings.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void _ignoreOfflineImages() {
  final original = FlutterError.onError;
  FlutterError.onError = (details) {
    if (details.exception is NetworkImageLoadException) return;
    original?.call(details);
  };
  addTearDown(() => FlutterError.onError = original);
}

Future<void> _pumpApp(WidgetTester tester) async {
  final pixel = (await tester.runAsync(_pixel))!;

  _ignoreOfflineImages();

  tester.view
    ..physicalSize = const Size(390, 844)
    ..devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(const _SignedInAuth()),
        panoramaImageLoaderProvider.overrideWithValue(
          (_) async => pixel.clone(),
        ),
        listingRepositoryProvider.overrideWithValue(_fakeApi()),
        apiClientProvider.overrideWithValue(_fakeClient()),
      ],
      child: const CustomerApp(showSplash: false),
    ),
  );
  await tester.pumpAndSettle();
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

class _SignedInAuth implements AuthGateway {
  const _SignedInAuth();

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

ApiClient _fakeClient() =>
    ApiClient(client: _fakeTransport(), baseUrl: 'http://test');

ListingRepository _fakeApi() => ListingRepository(_fakeClient());

MockClient _fakeTransport() {
  Map<String, dynamic> encode(ListingCardView l) => {
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
    'amenities': SampleData.detailById(l.id)?.amenities ?? const <String>[],
    'houseRules': SampleData.detailById(l.id)?.houseRules ?? const <String>[],
    'terms': SampleData.detailById(l.id)?.terms ?? const <String>[],
    'minStayNights': SampleData.detailById(l.id)?.minimumStayNights,
    'sharedFacilities':
        SampleData.detailById(l.id)?.sharedFacilities ?? const <String>[],
    'ownerName': SampleData.detailById(l.id)?.ownerName ?? '',
    'ownerVerified': SampleData.detailById(l.id)?.ownerVerified ?? false,
    'moveInCost': l.moveInCost == null
        ? null
        : {
            'lines': l.moveInCost!.lines
                .map((line) => {'label': line.label, 'centavos': line.centavos})
                .toList(),
            'totalCentavos': l.moveInCost!.totalCentavos,
          },
  };

  final client = MockClient((request) async {
    final segments = request.url.pathSegments;

    if (segments.length == 3 &&
        segments[0] == 'resources' &&
        segments[2] == 'tour') {
      final listingId = segments[1].replaceFirst('res-', '');
      final listing = SampleData.listings.firstWhere(
        (l) => l.id == listingId,
        orElse: () => SampleData.listings.first,
      );
      final scenes = SampleData.scenesFor(listing.id);
      if (scenes.isEmpty) {
        return http.Response(
          jsonEncode({'title': 'No tour for this place'}),
          404,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }

      return http.Response(
        jsonEncode({
          'id': 'tour-${listing.id}',
          'resourceId': segments[1],
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

    if (segments.length == 2 &&
        segments[0] == 'me' &&
        segments[1] == 'applications') {
      return http.Response(
        jsonEncode({
          'applications': [
            for (final a in SampleData.applications)
              {
                'id': a.id,
                'reference': a.reference,
                'state': switch (a.status) {
                  ApplicationStatus.underReview => 'UNDER_REVIEW',
                  ApplicationStatus.approved => 'APPROVED',
                  ApplicationStatus.rejected => 'REJECTED',
                  ApplicationStatus.withdrawn => 'WITHDRAWN',
                  ApplicationStatus.expired => 'EXPIRED',
                  ApplicationStatus.submitted => 'SUBMITTED',
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
                'decisionReason': a.reason,
                'decidedAt': a.decidedAt?.toIso8601String(),
                'createdAt': a.submittedAt.toIso8601String(),
                'documentCount': a.documents.length,
                'documentNames': a.documents,
                'reservation': a.holdExpiresAt == null
                    ? null
                    : {
                        'state': 'ACTIVE',
                        'feeCentavos': 200000,
                        'expiresAt': a.holdExpiresAt!.toIso8601String(),
                      },
              },
          ],
        }),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    }

    if (segments.length == 2 && segments[0] == 'me' && segments[1] == 'stays') {
      return http.Response(
        jsonEncode({
          'stays': [
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
          ],
        }),
        200,
        headers: {'content-type': 'application/json; charset=utf-8'},
      );
    }

    if (segments.length == 2) {
      final match = SampleData.cardById(segments[1]);
      if (match == null) {
        return http.Response(
          jsonEncode({'title': 'Listing not found'}),
          404,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      }
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
    if (q['hasTour'] == 'true') {
      rows = rows.where((l) => l.hasTour).toList();
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

  return client;
}

Finder get _page => find.byType(Scrollable).first;

Future<void> _openListing(WidgetTester tester, String title) async {
  final finder = find.text(title);
  await tester.scrollUntilVisible(finder.first, 300, scrollable: _page);
  await tester.pumpAndSettle();
  await tester.tap(finder.first);
  await tester.pumpAndSettle();
}

void main() {
  group('Money', () {
    test('formats centavos as whole pesos', () {
      expect(Money.peso(850000), '₱8,500');
      expect(Money.peso(3400000), '₱34,000');
      expect(Money.peso(350000), '₱3,500');
    });

    test('keeps centavos when exactness matters', () {
      expect(Money.pesoExact(850050), '₱8,500.50');
    });

    test('carries the price shape of each rental path', () {
      expect(Money.perMonth(850000), '₱8,500/mo');
      expect(Money.perNight(150000), '₱1,500/night');
    });
  });

  testWidgets('discovery leads with price and move-in cost', (tester) async {
    await _pumpApp(tester);

    expect(find.text('Find your next place'), findsOneWidget);
    expect(find.text('₱8,500 / month'), findsWidgets);

    final moveIn = find.text('₱34,000 to move in');
    await tester.scrollUntilVisible(moveIn, 300, scrollable: _page);
    expect(moveIn, findsOneWidget);
  });

  testWidgets('a listing opens its tour and walks between scenes', (
    tester,
  ) async {
    await _pumpApp(tester);

    await _openListing(
      tester,
      'One-bedroom corner unit with cross-ventilation',
    );

    final callout = find.text('Walk through it');
    await tester.scrollUntilVisible(callout, 250, scrollable: _page);
    await tester.pumpAndSettle();

    expect(callout, findsOneWidget);
    await tester.tap(callout);

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.text('Virtual Tour'), findsOneWidget);
    expect(find.text('Living room'), findsWidgets);
    expect(find.text('1/5'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 600));
    await tester.tap(find.text('Kitchen').hitTestable().first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.text('2/5'), findsOneWidget);
  });

  testWidgets('long-term goes to apply, nightly goes to dates', (tester) async {
    await _pumpApp(tester);

    await _openListing(
      tester,
      'One-bedroom corner unit with cross-ventilation',
    );
    expect(find.text('Apply to rent'), findsOneWidget);

    await tester.tap(find.text('Apply to rent'));
    await tester.pumpAndSettle();

    expect(find.text('Attach at least one document'), findsOneWidget);

    final notice = find.textContaining('does not reserve');
    await tester.scrollUntilVisible(notice, 200);
    expect(notice, findsOneWidget);
  });

  testWidgets('a photo-only listing offers no tour', (tester) async {
    await _pumpApp(tester);

    final parking = find.text('Covered parking slot, 24/7 access');
    await tester.dragUntilVisible(
      parking,
      find.byType(CustomScrollView).first,
      const Offset(0, -400),
    );
    await tester.pumpAndSettle();

    await tester.tap(parking);
    await tester.pumpAndSettle();

    expect(find.text('Walk through it'), findsNothing);
    expect(find.text('₱2,000/mo'), findsOneWidget);
  });

  testWidgets('an unavailable listing cannot be committed to', (tester) async {
    await _pumpApp(tester);

    final room = find.text('Private room with own CR');
    await tester.dragUntilVisible(
      room,
      find.byType(CustomScrollView).first,
      const Offset(0, -400),
    );
    await tester.pumpAndSettle();

    await tester.tap(room);
    await tester.pumpAndSettle();

    expect(find.text('Fully occupied'), findsWidgets);

    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Not available'),
    );
    expect(button.onPressed, isNull);
  });

  testWidgets('the category chips filter rentals', (tester) async {
    await _pumpApp(tester);

    expect(find.text('Featured for You'), findsOneWidget);

    await tester.tap(find.text('Condo'));
    await tester.pumpAndSettle();

    expect(find.text('Search Condos'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back_ios_new_rounded));
    await tester.pumpAndSettle();

    await tester.tap(find.text('House'));
    await tester.pumpAndSettle();

    expect(find.text('Search Houses'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back_ios_new_rounded));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Apartment'));
    await tester.pumpAndSettle();

    expect(find.text('Search Apartments'), findsOneWidget);
  });

  testWidgets('the header opens notifications and messages', (tester) async {
    await _pumpApp(tester);

    await tester.tap(find.bySemanticsLabel(RegExp('Notifications')));
    await tester.pumpAndSettle();
    expect(find.text('Your booking is confirmed'), findsOneWidget);
  });

  testWidgets('bookings list stays, and empty tabs offer a way out', (
    tester,
  ) async {
    await _pumpApp(tester);

    await tester.tap(find.text('Bookings'));
    await tester.pumpAndSettle();

    expect(find.text('Confirmed'), findsOneWidget);
    expect(find.text('₱4,500'), findsOneWidget);

    await tester.tap(find.text('Past'));
    await tester.pumpAndSettle();
    expect(find.text('Completed'), findsWidgets);

    await tester.tap(find.text('Cancelled'));
    await tester.pumpAndSettle();
    expect(find.text('Nothing cancelled'), findsOneWidget);
    expect(find.byType(EmptyBookingsArt), findsOneWidget);

    await tester.tap(find.text('Find a place to stay'));
    await tester.pumpAndSettle();
    expect(find.text('Find your next place'), findsOneWidget);
  });

  testWidgets('a booking opens its detail, with dates and what was paid', (
    tester,
  ) async {
    await _pumpApp(tester);

    await tester.tap(find.text('Bookings'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Condo stay, walking distance to IT Park'));
    await tester.pumpAndSettle();

    expect(find.text('CHECK-IN'), findsOneWidget);
    expect(find.text('CHECK-OUT'), findsOneWidget);
    expect(find.text('3 nights · 1 guest'), findsOneWidget);

    final prepaid = find.textContaining('no deposit');
    await tester.scrollUntilVisible(prepaid, 250);
    expect(prepaid, findsOneWidget);
  });

  testWidgets(
    'applications track their outcome, and a rejection explains itself',
    (tester) async {
      await _pumpApp(tester);

      await tester.tap(find.byIcon(Icons.person_outline));
      await tester.pumpAndSettle();

      await tester.tap(find.text('My applications'));
      await tester.pumpAndSettle();

      expect(find.textContaining('does not reserve the place'), findsOneWidget);

      expect(find.text('You have been approved'), findsOneWidget);
      expect(find.textContaining('held for you until'), findsOneWidget);

      final rejected = find.textContaining('accepted an application submitted');
      await tester.scrollUntilVisible(rejected, 250);
      expect(rejected, findsOneWidget);
      expect(find.textContaining('still on file'), findsOneWidget);
    },
  );
}
