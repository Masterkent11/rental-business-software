import 'dart:convert';

import 'package:customer_app/app/app.dart';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/auth_repository.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/app/clock.dart';
import 'package:customer_app/data/tour_repository.dart';
import 'package:customer_app/data/viewing_repository.dart';
import 'package:customer_app/features/viewing/request_viewing_controller.dart';
import 'package:customer_app/features/discovery/discovery_screen.dart';
import 'package:customer_app/features/inquiry/inquiry_screen.dart';
import 'package:customer_app/features/listing/listing_price.dart';
import 'package:customer_app/features/tour/tour_screen.dart';
import 'package:customer_app/fixtures/view_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'support/fake_auth.dart';

Map<String, dynamic> _saleJson({Object? priceCentavos}) => {
      'id': 'sale-1',
      'resourceId': 'res-sale-1',
      'intent': 'SALE',
      'pricing': 'ON_INQUIRY',
      'title': 'Modern house and lot in Talamban',
      'description': 'Four bedrooms, garden and a two-car garage close to schools.',
      'propertyName': 'Talamban Residence',
      'propertyType': 'HOUSE',
      'areaLabel': 'Talamban',
      'cityLabel': 'Cebu City',
      'kind': null,
      'resourceType': 'UNIT',
      'priceCentavos': priceCentavos,
      'hasTour': true,
      'tourProvider': 'PLATFORM',
      'sceneCount': 3,
      'photos': ['https://example.test/house.jpg'],
      'floorPlans': [
        {'id': 'fp-1', 'url': 'https://example.test/ground.png', 'label': 'Ground floor'},
      ],
      'saleStatus': 'READY_FOR_OCCUPANCY',
      'lotAreaSqm': 300,
      'parkingSlots': 2,
      'location': {'latitude': 10.35, 'longitude': 123.91, 'precision': 'APPROXIMATE'},
      'distanceKm': 2.4,
      'availabilityLabel': 'Ready for occupancy',
      'isAvailable': true,
      'amenities': ['Garage', 'Garden'],
      'houseRules': <String>[],
      'terms': <String>[],
      'bedrooms': 4,
      'bathrooms': 3,
      'floorAreaSqm': 220,
      'ownerName': 'Santos Realty',
      'ownerVerified': true,
    };

Map<String, dynamic> _rentJson() => {
      'id': 'rent-1',
      'resourceId': 'res-rent-1',
      'intent': 'RENT',
      'pricing': 'LISTED',
      'title': 'Studio near the business park',
      'description': 'Bright studio with balcony.',
      'propertyName': 'Park Tower',
      'propertyType': 'CONDO',
      'areaLabel': 'Lahug',
      'cityLabel': 'Cebu City',
      'kind': 'LONG_TERM',
      'resourceType': 'UNIT',
      'priceCentavos': 1800000,
      'hasTour': false,
      'sceneCount': 0,
      'photos': <String>[],
      'availabilityLabel': 'Available now',
      'isAvailable': true,
      'amenities': <String>[],
      'houseRules': <String>[],
      'terms': <String>[],
      'bedrooms': 1,
      'bathrooms': 1,
      'ownerName': 'Park Owners',
      'ownerVerified': false,
    };

void main() {
  group('Sale price privacy', () {
    test('a sale listing never carries a price, even if one is sent', () {
      final card = ListingRepository.toCard(_saleJson(priceCentavos: 1850000000));
      expect(card.isSale, isTrue);
      expect(card.priceCentavos, isNull);
      expect(card.hasListedPrice, isFalse);
      expect(listingPriceLabel(card), kPriceOnInquiry);
      expect(listingPriceShort(card), isNot(contains('₱')));
    });

    test('sale details map floor plans, lot area and approximate location', () {
      final card = ListingRepository.toCard(_saleJson());
      expect(card.lotAreaSqm, 300);
      expect(card.parkingSlots, 2);
      expect(card.typeLabel, 'House & Lot');
      expect(card.location?.precision, LocationPrecision.approximate);
      expect(card.distanceLabel, '2.4 km away');
    });

    test('rentals keep their listed price', () {
      final card = ListingRepository.toCard(_rentJson());
      expect(card.isSale, isFalse);
      expect(listingPriceLabel(card), '₱18,000/mo');
    });
  });

  group('Inquiries and viewings', () {
    test('budgets parse to centavos and reject empty or zero amounts', () {
      expect(parseBudgetCentavos('18,500,000'), 1850000000);
      expect(parseBudgetCentavos('₱ 2,500,000.50'), 250000050);
      expect(parseBudgetCentavos(''), isNull);
      expect(parseBudgetCentavos('0'), isNull);
    });

    test('a chip-only inquiry still sends a message', () {
      expect(composeInquiryMessage('  ', ['Is this available?']), 'Is this available?');
      expect(composeInquiryMessage('Hello', ['Is this available?']), 'Hello');
      expect(composeInquiryMessage('', const []), isEmpty);
    });

    test('time windows follow Manila time and close an hour before they end', () {
      final day = DateTime.utc(2026, 10, 8);
      expect(ViewingTimeWindow.afternoon.rangeLabel, '12:00 PM  4:00 PM');
      expect(ViewingTimeWindow.morning.isOpenOn(day, DateTime.utc(2026, 10, 8, 2, 59)), isTrue);
      expect(ViewingTimeWindow.morning.isOpenOn(day, DateTime.utc(2026, 10, 8, 3, 1)), isFalse);
      expect(ViewingTimeWindow.evening.isOpenOn(day, DateTime.utc(2026, 10, 8, 10)), isTrue);
      final days = requestableDays(DateTime.utc(2026, 10, 8, 12));
      expect(isoDay(days.first), '2026-10-09');
      expect(days.length, 30);
    });
  });

  group('Tours', () {
    test('platform tour resolves entry scene and scenes', () {
      const scene1 = TourSceneApiView(
        id: 's1',
        label: 'Living room',
        position: 0,
        previewUrl: 'https://example.test/1.jpg',
        thumbnailUrl: null,
        tileUrlTemplate: null,
        tileLevels: 0,
        hotspots: [],
      );
      const scene2 = TourSceneApiView(
        id: 's2',
        label: 'Kitchen',
        position: 1,
        previewUrl: 'https://example.test/2.jpg',
        thumbnailUrl: null,
        tileUrlTemplate: null,
        tileLevels: 0,
        hotspots: [],
      );
      const tour = TourView(
        id: 't1',
        resourceId: 'r1',
        entrySceneId: 's1',
        scenes: [scene1, scene2],
      );
      expect(tour.entryScene?.id, 's1');
      expect(tour.sceneById('s2')?.label, 'Kitchen');
    });

    test('the starting view uses the saved heading, with upward pitch looking up', () {
      const scene = TourSceneApiView(
        id: 's',
        label: 'Living room',
        position: 0,
        previewUrl: 'https://example.test/p.jpg',
        thumbnailUrl: null,
        tileUrlTemplate: null,
        tileLevels: 0,
        hotspots: [],
        initialYaw: 90,
        initialPitch: 10,
        initialFov: 60,
      );
      final camera = startingCamera(scene);
      expect(camera.yaw, closeTo(1.5708, 1e-3));
      expect(camera.pitch, closeTo(-0.1745, 1e-3));
      expect(camera.fov, closeTo(1.0472, 1e-3));
    });
  });

  group('Request a viewing', () {
    testWidgets('detail shows no agent and one CTA; the request goes to the API and the assigned agent comes back',
        (tester) async {
      final api = _FakeApi();
      await _pumpApp(tester, api);

      await tester.dragUntilVisible(find.text('Buy'), find.byType(HomeCategoryRow), const Offset(-200, 0));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Buy'));
      await tester.pumpAndSettle();
      expect(find.text(kPriceOnInquiry), findsWidgets);
      expect(find.textContaining('₱'), findsNothing);
      final search =
          api.requests.lastWhere((r) => r.url.path == '/listings' && r.url.queryParameters['intent'] == 'SALE');
      expect(search.url.queryParameters.containsKey('maxPrice'), isFalse);

      await tester.ensureVisible(find.text('Modern house and lot in Talamban'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Modern house and lot in Talamban'));
      await tester.pumpAndSettle();

      for (final tab in ['Overview', 'Photos', '360° Tour', 'Floor Plan', 'Map']) {
        expect(find.text(tab, skipOffstage: false), findsOneWidget);
      }
      expect(find.text('Request a viewing'), findsOneWidget);
      expect(find.text('Message'), findsNothing);
      expect(find.text('Inquire Now'), findsNothing);
      expect(find.text('Schedule a viewing'), findsNothing);
      expect(find.text('Your agent'), findsNothing);
      expect(find.text('Jun Reyes'), findsNothing);
      expect(find.textContaining('Maria'), findsNothing);
      expect(find.textContaining('₱'), findsNothing);

      await tester.tap(find.text('Request a viewing'));
      await tester.pumpAndSettle();
      expect(find.text('Select a date'), findsOneWidget);
      expect(find.text('Preferred time'), findsOneWidget);
      expect(find.text('0/300'), findsOneWidget);
      expect(find.byType(DropdownButton<String>), findsNothing);
      expect(find.byType(CircleAvatar), findsNothing);
      final send = find.widgetWithText(FilledButton, 'Send viewing request');
      expect(tester.widget<FilledButton>(send).onPressed, isNull);

      await tester.tap(find.text('Afternoon'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Coming with my partner.');
      await tester.pumpAndSettle();
      expect(find.text('23/300'), findsOneWidget);
      await tester.tap(send);
      await tester.pump();
      expect(find.text('Finding the best available agent for you…'), findsOneWidget);
      expect(find.text('Checking agent availability'), findsOneWidget);
      await tester.pumpAndSettle();

      expect(find.text('Viewing request sent'), findsOneWidget);
      expect(find.text('Jun Reyes'), findsOneWidget);
      expect(find.text('Property specialist'), findsOneWidget);
      expect(find.text('Santos Realty'), findsOneWidget);
      expect(find.bySemanticsLabel('Verified agent'), findsOneWidget);
      expect(find.textContaining('Maria'), findsNothing);
      expect(find.text('Thursday, October 8'), findsWidgets);
      expect(find.text('Afternoon (12:00 PM  4:00 PM)'), findsWidgets);
      expect(find.text('Request sent'), findsOneWidget);
      expect(find.text('Agent confirming'), findsOneWidget);
      expect(find.text('Viewing confirmed'), findsOneWidget);
      expect(find.text('Open conversation'), findsOneWidget);
      expect(find.text('View my requests'), findsOneWidget);
      expect(find.textContaining('₱'), findsNothing);

      final posted =
          api.requests.where((r) => r.method == 'POST' && r.url.path == '/listings/sale-1/viewings').toList();
      expect(posted, hasLength(1));
      final body = jsonDecode(posted.single.body) as Map<String, dynamic>;
      expect(body['preferredDate'], '2026-10-08');
      expect(body['preferredTimeWindow'], 'AFTERNOON');
      expect(body['note'], 'Coming with my partner.');
      expect(body['idempotencyKey'], matches(RegExp(r'^[0-9a-f-]{36}$')));
      expect(body.containsKey('agentId'), isFalse);

      api.status = 'CONFIRMED';
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(find.text('Viewing confirmed'), findsWidgets);
      expect(find.text('Thursday, October 8'), findsWidgets);
      expect(find.text('2:30 PM'), findsWidgets);
      expect(find.text('Jun Reyes'), findsOneWidget);
      await _unmount(tester);
    });

    testWidgets('a failed send is recoverable and the retry reuses the same idempotency key', (tester) async {
      final api = _FakeApi()..failNextViewing = true;
      await _pumpApp(tester, api, home: '/discover/listing/sale-1/viewing');

      await tester.tap(find.text('Morning'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Send viewing request'));
      await tester.pumpAndSettle();
      expect(find.text('We couldn\u2019t complete your viewing request.'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);

      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();
      expect(find.text('Viewing request sent'), findsOneWidget);
      final keys = api.requests
          .where((r) => r.method == 'POST' && r.url.path == '/listings/sale-1/viewings')
          .map((r) => (jsonDecode(r.body) as Map<String, dynamic>)['idempotencyKey'])
          .toList();
      expect(keys, hasLength(2));
      expect(keys.toSet(), hasLength(1));
      await _unmount(tester);
    });

    testWidgets('when no specialist is free yet the screen says so instead of inventing an agent', (tester) async {
      final api = _FakeApi()..matching = true;
      await _pumpApp(tester, api, home: '/discover/listing/sale-1/viewing', reduceMotion: true);

      await tester.tap(find.text('Evening'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Send viewing request'));
      await tester.pumpAndSettle();
      expect(find.text('Viewing request sent'), findsOneWidget);
      expect(find.text('Finding a specialist'), findsOneWidget);
      expect(find.textContaining('All specialists for this property are busy'), findsOneWidget);
      expect(find.byIcon(Icons.verified_rounded), findsNothing);
      expect(find.textContaining('Maria'), findsNothing);
      await _unmount(tester);
    });
  });
}

Future<void> _unmount(WidgetTester tester) async {
  await tester.pumpWidget(const SizedBox.shrink());
  await tester.pump();
}

class _FakeApi {
  final List<http.Request> requests = [];
  bool failNextViewing = false;
  bool matching = false;
  String status = 'REQUESTED';

  Map<String, dynamic> viewing(Map<String, dynamic>? posted) => {
        'id': 'viewing-1',
        'listingId': 'sale-1',
        'listingTitle': 'Modern house and lot in Talamban',
        'listingPhoto': null,
        'areaLabel': 'Talamban',
        'cityLabel': 'Cebu City',
        'organizationName': 'Santos Realty',
        'agentId': matching ? null : 'agent-77',
        'agentName': matching ? null : 'Jun Reyes',
        'inquiryId': null,
        'conversationId': 'conv-9',
        'preferredDate': posted?['preferredDate'] ?? '2026-10-08',
        'preferredTimeWindow': posted?['preferredTimeWindow'] ?? 'AFTERNOON',
        'timeZone': 'Asia/Manila',
        'scheduledAt': status == 'CONFIRMED' ? '2026-10-08T06:30:00.000Z' : null,
        'durationMinutes': 60,
        'status': matching ? 'MATCHING' : status,
        'customerNote': posted?['note'] ?? '',
        'partnerNote': '',
        'agentChangeNotice': null,
        'confirmedAt': null,
        'declinedAt': null,
        'cancelledAt': null,
        'cancelledByRole': null,
        'createdAt': '2026-10-08T02:00:00.000Z',
        'updatedAt': status == 'CONFIRMED' ? '2026-10-08T02:10:00.000Z' : '2026-10-08T02:00:00.000Z',
      };

  Map<String, dynamic> request(Map<String, dynamic>? posted) => {
        'viewingRequest': viewing(posted),
        'assignmentState': matching ? 'MATCHING' : 'ASSIGNED',
        'assignedAgent': matching
            ? null
            : {
                'id': 'agent-77',
                'displayName': 'Jun Reyes',
                'role': 'Property specialist',
                'photoUrl': null,
                'verified': true,
                'organizationName': 'Santos Realty',
              },
      };
}

Future<void> _pumpApp(WidgetTester tester, _FakeApi api, {String? home, bool reduceMotion = false}) async {
  final original = FlutterError.onError;
  FlutterError.onError = (details) {
    if (details.exception is NetworkImageLoadException) return;
    original?.call(details);
  };
  addTearDown(() => FlutterError.onError = original);
  tester.view
    ..physicalSize = const Size(390, 844)
    ..devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  if (reduceMotion) {
    tester.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
  }

  final client = ApiClient(client: _transport(api), baseUrl: 'http://test');
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuth.signedIn()),
        apiClientProvider.overrideWithValue(client),
        listingRepositoryProvider.overrideWithValue(ListingRepository(client)),
        clockProvider.overrideWithValue(() => DateTime.utc(2026, 10, 8, 2)),
        viewingStepMinimumProvider.overrideWithValue(const Duration(milliseconds: 40)),
        viewingReconcileIntervalProvider.overrideWithValue(const Duration(hours: 1)),
      ],
      child: const CustomerApp(showSplash: false),
    ),
  );
  await tester.pumpAndSettle();
  if (home != null) {
    GoRouter.of(tester.element(find.byType(Scaffold).first)).push(home);
    await tester.pumpAndSettle();
  }
}

MockClient _transport(_FakeApi api) {
  http.Response json(Object body, [int status = 200]) =>
      http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json; charset=utf-8'});

  return MockClient((request) async {
    api.requests.add(request);
    final path = request.url.path;
    final query = request.url.queryParameters;
    if (path == '/listings') {
      final items = query['intent'] == 'SALE' ? [_saleJson()] : [_rentJson()];
      return json({'items': items, 'total': items.length, 'hasMore': false});
    }
    if (path == '/listings/sale-1') return json(_saleJson());
    if (path == '/listings/rent-1') return json(_rentJson());
    if (path == '/listings/sale-1/viewings' && request.method == 'POST') {
      if (api.failNextViewing) {
        api.failNextViewing = false;
        return json({'title': 'Busy right now — try again', 'message': 'Busy right now — try again'}, 503);
      }
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      return json({...api.request(body), 'created': true}, 201);
    }
    if (path == '/me/viewings/viewing-1') return json(api.request(null));
    if (path == '/me/viewings') return json({'items': <dynamic>[]});
    if (path == '/me') {
      return json({
        'id': 'user-test',
        'displayName': 'Carlo Mendoza',
        'email': 'guest@example.test',
        'capabilities': [
          {'capability': 'CUSTOMER', 'organizationId': null},
        ],
        'organizations': <dynamic>[],
      });
    }
    if (path == '/me/notifications') return json({'notifications': <dynamic>[], 'unreadCount': 0});
    if (path == '/me/conversations') return json({'conversations': <dynamic>[]});
    if (path == '/me/saved-listings') return json({'items': <dynamic>[], 'listingIds': <dynamic>[]});
    if (path == '/locations/areas') return json({'items': <dynamic>[]});
    return json({'title': 'Not found'}, 404);
  });
}
