import 'dart:convert';

import 'package:customer_app/app/app.dart';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/auth_repository.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/data/tour_repository.dart';
import 'package:customer_app/features/discovery/discovery_screen.dart';
import 'package:customer_app/features/inquiry/inquiry_screen.dart';
import 'package:customer_app/features/listing/listing_price.dart';
import 'package:customer_app/features/tour/tour_screen.dart';
import 'package:customer_app/features/viewing/schedule_viewing_screen.dart';
import 'package:customer_app/fixtures/view_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
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
      'representative': {
        'agentId': 'agent-1',
        'displayName': 'Maria Santos',
        'headline': 'Licensed broker',
        'photoUrl': null,
        'verified': true,
      },
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

    test('sale details map agent, floor plans, lot area and approximate location', () {
      final card = ListingRepository.toCard(_saleJson());
      expect(card.representative?.displayName, 'Maria Santos');
      expect(card.representative?.verified, isTrue);
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

    test('viewing slots are shown in Philippine time regardless of device zone', () {
      expect(slotTimeLabel(DateTime.utc(2026, 10, 9, 1)), '9:00 AM');
      expect(slotTimeLabel(DateTime.utc(2026, 10, 9, 8)), '4:00 PM');
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

  group('Buy flow', () {
    testWidgets('a buyer browses for sale, sees no price and sends an inquiry', (tester) async {
      final requests = <http.Request>[];
      await _pumpApp(tester, requests);

      await tester.dragUntilVisible(find.text('Buy'), find.byType(HomeCategoryRow), const Offset(-200, 0));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Buy'));
      await tester.pumpAndSettle();

      expect(find.text('Properties for sale'), findsOneWidget);
      expect(find.text('Rent'), findsNothing);
      expect(find.text('Modern house and lot in Talamban'), findsWidgets);
      expect(find.text(kPriceOnInquiry), findsWidgets);
      expect(find.textContaining('₱'), findsNothing);
      final search = requests.lastWhere((r) => r.url.path == '/listings' && r.url.queryParameters['intent'] == 'SALE');
      expect(search.url.queryParameters.containsKey('maxPrice'), isFalse);

      await tester.ensureVisible(find.text('Modern house and lot in Talamban'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Modern house and lot in Talamban'));
      await tester.pumpAndSettle();
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -500));
      await tester.pumpAndSettle();

      for (final tab in ['Overview', 'Photos', '360° Tour', 'Floor Plan', 'Map']) {
        expect(find.text(tab, skipOffstage: false), findsOneWidget);
      }
      expect(find.text('Maria Santos'), findsOneWidget);
      expect(find.textContaining('₱'), findsNothing);

      await tester.ensureVisible(find.text('Floor Plan', skipOffstage: false));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Floor Plan'));
      await tester.pumpAndSettle();
      expect(find.text('Ground floor'), findsOneWidget);

      await tester.tap(find.text('Inquire Now'));
      await tester.pumpAndSettle();
      expect(find.text('What would you like to know?'), findsOneWidget);

      await tester.tap(find.text('Can I schedule a viewing?'));
      await tester.pump();
      await tester.drag(find.byType(ListView).first, const Offset(0, -300));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Send Inquiry'));
      await tester.pumpAndSettle();

      expect(find.text('Inquiry sent'), findsOneWidget);
      final submitted = requests.singleWhere((r) => r.method == 'POST' && r.url.path == '/listings/sale-1/inquiries');
      final body = jsonDecode(submitted.body) as Map<String, dynamic>;
      expect(body['questions'], ['Is this available?', 'Can I schedule a viewing?']);
      expect(body['buyerBudgetCentavos'], isNull);
      expect(body['clientRef'], matches(RegExp(r'^[0-9a-f-]{36}$')));
    });
  });
}

Future<void> _pumpApp(WidgetTester tester, List<http.Request> requests) async {
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

  final client = ApiClient(client: _transport(requests), baseUrl: 'http://test');
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authRepositoryProvider.overrideWithValue(FakeAuth.signedIn()),
        apiClientProvider.overrideWithValue(client),
        listingRepositoryProvider.overrideWithValue(ListingRepository(client)),
      ],
      child: const CustomerApp(showSplash: false),
    ),
  );
  await tester.pumpAndSettle();
}

MockClient _transport(List<http.Request> requests) {
  http.Response json(Object body, [int status = 200]) =>
      http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json; charset=utf-8'});

  return MockClient((request) async {
    requests.add(request);
    final path = request.url.path;
    final query = request.url.queryParameters;
    if (path == '/listings') {
      final items = query['intent'] == 'SALE' ? [_saleJson()] : [_rentJson()];
      return json({'items': items, 'total': items.length, 'hasMore': false});
    }
    if (path == '/listings/sale-1') return json(_saleJson());
    if (path == '/listings/rent-1') return json(_rentJson());
    if (path == '/me/listings/sale-1/inquiry') return json({'inquiry': null});
    if (path == '/listings/sale-1/inquiries' && request.method == 'POST') {
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      return json({
        'inquiry': {
          'id': 'inq-1',
          'listingId': 'sale-1',
          'listingTitle': 'Modern house and lot in Talamban',
          'listingPhoto': null,
          'areaLabel': 'Talamban',
          'cityLabel': 'Cebu City',
          'organizationName': 'Santos Realty',
          'agentId': 'agent-1',
          'agentName': 'Maria Santos',
          'conversationId': 'conv-1',
          'message': body['message'],
          'questions': body['questions'],
          'buyerBudgetCentavos': body['buyerBudgetCentavos'],
          'status': 'SENT',
          'responded': false,
          'createdAt': '2026-10-08T02:00:00.000Z',
        },
        'created': true,
        'alreadyOpen': false,
      }, 201);
    }
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
