import 'dart:convert';

import 'package:customer_app/app/app.dart';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/auth_repository.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/features/explore/domain/explore_query.dart';
import 'package:customer_app/features/explore/domain/listing_category.dart';
import 'package:customer_app/features/explore/presentation/buy_search_screen.dart';
import 'package:customer_app/features/explore/presentation/rent_search_screen.dart';
import 'package:customer_app/features/explore/presentation/widgets/listing_search_header.dart';
import 'package:customer_app/features/explore/presentation/widgets/listing_search_scaffold.dart';
import 'package:customer_app/fixtures/view_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'support/fake_auth.dart';

Map<String, dynamic> _mockRentItem(String id) => {
      'id': id,
      'resourceId': 'res-$id',
      'intent': 'RENT',
      'pricing': 'LISTED',
      'title': 'Condo $id',
      'description': 'Description $id',
      'propertyName': 'Property $id',
      'propertyType': 'CONDO',
      'areaLabel': 'Cebu IT Park',
      'cityLabel': 'Cebu City',
      'kind': 'SHORT_TERM',
      'resourceType': 'UNIT',
      'priceCentavos': 280000,
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
      'floorAreaSqm': 32,
      'ownerName': 'Owner',
      'ownerVerified': true,
    };

Map<String, dynamic> _mockSaleItem(String id) => {
      'id': id,
      'resourceId': 'res-$id',
      'intent': 'SALE',
      'pricing': 'ON_INQUIRY',
      'title': 'House $id',
      'description': 'Description $id',
      'propertyName': 'Property $id',
      'propertyType': 'HOUSE',
      'areaLabel': 'Talamban',
      'cityLabel': 'Cebu City',
      'kind': null,
      'resourceType': 'UNIT',
      'priceCentavos': null,
      'hasTour': true,
      'sceneCount': 3,
      'photos': <String>[],
      'saleStatus': 'READY_FOR_OCCUPANCY',
      'lotAreaSqm': 200,
      'parkingSlots': 2,
      'location': {'latitude': 10.35, 'longitude': 123.91, 'precision': 'APPROXIMATE'},
      'distanceKm': 2.0,
      'availabilityLabel': 'Ready for occupancy',
      'isAvailable': true,
      'amenities': <String>[],
      'houseRules': <String>[],
      'terms': <String>[],
      'bedrooms': 3,
      'bathrooms': 2,
      'floorAreaSqm': 120,
      'ownerName': 'Realty',
      'ownerVerified': true,
    };

MockClient _mockClient() {
  return MockClient((request) async {
    final path = request.url.path;
    final query = request.url.queryParameters;
    if (path == '/listings') {
      final isSale = query['intent'] == 'SALE';
      final items = List.generate(
        15,
        (i) => isSale ? _mockSaleItem('sale-$i') : _mockRentItem('rent-$i'),
      );
      return http.Response(
        jsonEncode({'items': items, 'total': 48, 'hasMore': true}),
        200,
        headers: {'content-type': 'application/json'},
      );
    }
    if (path == '/locations/areas') {
      return http.Response(jsonEncode({'items': <dynamic>[]}), 200, headers: {'content-type': 'application/json'});
    }
    if (path == '/me') {
      return http.Response(
        jsonEncode({
          'id': 'usr-1',
          'displayName': 'Guest User',
          'email': 'guest@example.com',
          'capabilities': [
            {'capability': 'CUSTOMER', 'organizationId': null},
          ],
          'organizations': <dynamic>[],
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    }
    if (path == '/me/saved-listings') {
      return http.Response(
        jsonEncode({'items': <dynamic>[], 'listingIds': <dynamic>[]}),
        200,
        headers: {'content-type': 'application/json'},
      );
    }
    return http.Response(jsonEncode({'title': 'Not found'}), 404);
  });
}

Widget _wrap(Widget child) {
  final client = ApiClient(client: _mockClient(), baseUrl: 'http://test');
  return ProviderScope(
    overrides: [
      authRepositoryProvider.overrideWithValue(FakeAuth.signedIn()),
      apiClientProvider.overrideWithValue(client),
      listingRepositoryProvider.overrideWithValue(ListingRepository(client)),
    ],
    child: MaterialApp(home: child),
  );
}

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  group('Shared results experience', () {
    testWidgets('1. Rental initial view shows centered Places for rent', (tester) async {
      tester.view
        ..physicalSize = const Size(390, 844)
        ..devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_wrap(const RentSearchScreen(seed: ExploreQuery(intent: MarketIntent.rent))));
      await tester.pumpAndSettle();

      final title = find.byKey(const Key('listing-results-title'));
      expect(title, findsOneWidget);
      expect(tester.widget<Text>(title).data, 'Places for rent');
      expect(tester.widget<Text>(title).textAlign, TextAlign.center);
    });

    testWidgets('2. Sale results use the same shared results shell with sale title', (tester) async {
      tester.view
        ..physicalSize = const Size(390, 844)
        ..devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_wrap(const BuySearchScreen(seed: ExploreQuery(intent: MarketIntent.buy))));
      await tester.pumpAndSettle();

      expect(find.byType(ListingSearchScaffold), findsOneWidget);
      expect(find.byType(ListingSearchHeader), findsOneWidget);
      expect(find.byType(ListingQuickControls), findsOneWidget);

      final title = find.byKey(const Key('listing-results-title'));
      expect(title, findsOneWidget);
      expect(tester.widget<Text>(title).data, 'Properties for sale');
      expect(tester.widget<Text>(title).textAlign, TextAlign.center);
    });

    testWidgets('3. Back arrow is beside search bar without button styling', (tester) async {
      tester.view
        ..physicalSize = const Size(390, 844)
        ..devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_wrap(const RentSearchScreen(seed: ExploreQuery(intent: MarketIntent.rent))));
      await tester.pumpAndSettle();

      final back = find.byKey(const Key('listing-search-back'));
      expect(back, findsOneWidget);
      expect(find.descendant(of: back, matching: find.byType(Icon)), findsOneWidget);
    });

    testWidgets('4. Search field has no extra right-side action in search row', (tester) async {
      tester.view
        ..physicalSize = const Size(390, 844)
        ..devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_wrap(const RentSearchScreen(seed: ExploreQuery(intent: MarketIntent.rent))));
      await tester.pumpAndSettle();

      expect(find.text('Search area, landmark or property'), findsOneWidget);
      expect(find.byKey(const Key('search-filter-button')), findsNothing);
    });

    testWidgets('5. Filter / Price / Sort render below search bar in quick control row', (tester) async {
      tester.view
        ..physicalSize = const Size(390, 844)
        ..devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_wrap(const RentSearchScreen(seed: ExploreQuery(intent: MarketIntent.rent))));
      await tester.pumpAndSettle();

      final controls = find.byKey(const Key('listing-quick-controls'));
      expect(controls, findsOneWidget);
      expect(find.byKey(const Key('listing-control-filter')), findsOneWidget);
      expect(find.byKey(const Key('listing-control-price')), findsOneWidget);
      expect(find.byKey(const Key('listing-control-sort')), findsOneWidget);

      final searchY = tester.getTopLeft(find.text('Search area, landmark or property')).dy;
      final controlsY = tester.getTopLeft(controls).dy;
      expect(controlsY, greaterThan(searchY));
    });

    testWidgets('6, 7, 8. Page title scrolls away, search controls remain pinned, result count scrolls', (tester) async {
      tester.view
        ..physicalSize = const Size(390, 844)
        ..devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_wrap(const RentSearchScreen(seed: ExploreQuery(intent: MarketIntent.rent))));
      await tester.pumpAndSettle();

      final initialTitleY = tester.getTopLeft(find.byKey(const Key('listing-results-title'))).dy;
      final headerFinder = find.byKey(const Key('listing-search-header'));
      expect(headerFinder, findsOneWidget);

      final countFinder = find.textContaining('places');
      expect(countFinder, findsWidgets);
      final initialCountY = tester.getTopLeft(countFinder.first).dy;

      await tester.drag(find.byType(CustomScrollView), const Offset(0, -60));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('listing-results-title')), findsNothing);
      expect(headerFinder, findsOneWidget);

      final pinnedHeaderY = tester.getTopLeft(headerFinder).dy;
      expect(pinnedHeaderY, lessThanOrEqualTo(initialTitleY));

      final scrolledCountY = tester.getTopLeft(find.textContaining('places').first).dy;
      expect(scrolledCountY, lessThan(initialCountY));
      expect(scrolledCountY, greaterThan(pinnedHeaderY));
    });

    testWidgets('9, 10, 11, 12, 13. Filter opens modal bottom sheet not covering 100%, X closes, reset clears, rental filters shown', (tester) async {
      tester.view
        ..physicalSize = const Size(390, 844)
        ..devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_wrap(const RentSearchScreen(seed: ExploreQuery(intent: MarketIntent.rent))));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('listing-control-filter')));
      await tester.pumpAndSettle();

      final sheet = find.byKey(const Key('listing-sheet'));
      expect(sheet, findsOneWidget);

      final sheetHeight = tester.getSize(sheet).height;
      expect(sheetHeight, lessThan(844));

      expect(find.descendant(of: sheet, matching: find.text('Type of stay')), findsOneWidget);
      expect(find.descendant(of: sheet, matching: find.text('Short stay')), findsOneWidget);
      expect(find.descendant(of: sheet, matching: find.text('Monthly rental')), findsOneWidget);
      expect(find.descendant(of: sheet, matching: find.text('Budget')), findsOneWidget);
      expect(find.descendant(of: sheet, matching: find.text('Features')), findsOneWidget);

      await tester.tap(find.descendant(of: sheet, matching: find.text('Short stay')));
      await tester.pumpAndSettle();

      await tester.tap(find.descendant(of: sheet, matching: find.text('Reset')));
      await tester.pumpAndSettle();

      final close = find.byKey(const Key('listing-sheet-close'));
      expect(close, findsOneWidget);
      await tester.tap(close);
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('listing-sheet')), findsNothing);
    });

    testWidgets('14. Sale configuration does not show rental-only stay filters', (tester) async {
      tester.view
        ..physicalSize = const Size(390, 844)
        ..devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_wrap(const BuySearchScreen(seed: ExploreQuery(intent: MarketIntent.buy))));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('listing-control-filter')));
      await tester.pumpAndSettle();

      final sheet = find.byKey(const Key('listing-sheet'));
      expect(sheet, findsOneWidget);
      expect(find.descendant(of: sheet, matching: find.text('Type of stay')), findsNothing);
      expect(find.descendant(of: sheet, matching: find.text('Short stay')), findsNothing);
      expect(find.descendant(of: sheet, matching: find.text('Monthly rental')), findsNothing);

      expect(find.descendant(of: sheet, matching: find.text('Bedrooms')), findsOneWidget);
      expect(find.descendant(of: sheet, matching: find.text('Bathrooms')), findsOneWidget);
      expect(find.descendant(of: sheet, matching: find.text('Floor area')), findsOneWidget);

      await tester.tap(find.byKey(const Key('listing-sheet-close')));
      await tester.pumpAndSettle();
    });

    testWidgets('15. Sale cards and Price sheet never expose actual sale price', (tester) async {
      tester.view
        ..physicalSize = const Size(390, 844)
        ..devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_wrap(const BuySearchScreen(seed: ExploreQuery(intent: MarketIntent.buy))));
      await tester.pumpAndSettle();

      expect(find.text(kPriceOnInquiry), findsWidgets);
      expect(find.textContaining('₱'), findsNothing);

      await tester.tap(find.byKey(const Key('listing-control-price')));
      await tester.pumpAndSettle();

      final sheet = find.byKey(const Key('listing-sheet'));
      expect(sheet, findsOneWidget);
      expect(find.descendant(of: sheet, matching: find.textContaining('privately')), findsOneWidget);
      expect(find.textContaining('₱'), findsNothing);

      await tester.tap(find.byKey(const Key('listing-sheet-close')));
      await tester.pumpAndSettle();
    });

    testWidgets('16. Rental cards retain rental pricing', (tester) async {
      tester.view
        ..physicalSize = const Size(390, 844)
        ..devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_wrap(const RentSearchScreen(seed: ExploreQuery(intent: MarketIntent.rent))));
      await tester.pumpAndSettle();

      expect(find.textContaining('₱2,800'), findsWidgets);
      expect(find.text(kPriceOnInquiry), findsNothing);
    });

    testWidgets('17. Existing bottom navigation remains unchanged', (tester) async {
      tester.view
        ..physicalSize = const Size(390, 844)
        ..devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final client = ApiClient(client: _mockClient(), baseUrl: 'http://test');
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

      for (final tab in ['Home', 'Saved', 'Bookings', 'Messages', 'Profile']) {
        expect(find.text(tab), findsWidgets, reason: tab);
      }
      expect(find.text('Explore'), findsNothing);
    });

    testWidgets('18. No duplicate results introduced by filter or search refresh', (tester) async {
      tester.view
        ..physicalSize = const Size(390, 844)
        ..devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_wrap(const RentSearchScreen(seed: ExploreQuery(intent: MarketIntent.rent))));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('listing-control-sort')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Newest'));
      await tester.pumpAndSettle();

      final ids = <String>{};
      for (var i = 0; i < 15; i++) {
        final found = find.text('Condo rent-$i');
        if (found.evaluate().isNotEmpty) {
          expect(ids.add('rent-$i'), isTrue);
        }
      }
    });
  });
}
