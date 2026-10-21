import 'package:customer_app/app/app.dart';
import 'package:customer_app/app/clock.dart';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/auth_repository.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/features/discovery/discovery_screen.dart';
import 'package:customer_app/features/explore/presentation/buy_search_screen.dart';
import 'package:customer_app/features/explore/presentation/rent_search_screen.dart';
import 'package:customer_app/features/explore/presentation/stay_results_screen.dart';
import 'package:customer_app/features/explore/presentation/stay_search_screen.dart';
import 'package:customer_app/features/explore/presentation/widgets/why_book_section.dart';
import 'package:customer_app/features/listing/listing_detail_screen.dart';
import 'package:customer_app/fixtures/view_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;

import 'support/fake_auth.dart';
import 'support/listing_json.dart';

final _now = DateTime(2026, 10, 9, 10);

class _Backend {
  final requests = <http.Request>[];
  http.Response Function(http.Request request)? listings;
  bool helpFails = false;

  List<http.Request> get searches =>
      requests.where((r) => r.url.path == '/listings' && r.url.queryParameters.containsKey('kind')).toList();

  http.Response? handle(http.Request request) {
    final path = request.url.path;
    if (path == '/listings') {
      final custom = listings;
      if (custom != null) return custom(request);
      final query = request.url.queryParameters;
      if (query['intent'] == 'SALE') return jsonResponse(listingPageJson([saleListingJson()]));
      final type = query['propertyType'] ?? 'CONDO';
      return jsonResponse(
        listingPageJson([rentListingJson(id: 'rent-${type.toLowerCase()}', title: 'Bright $type near the park')]),
      );
    }
    if (path.startsWith('/listings/rent-')) {
      return jsonResponse(rentListingJson(id: path.split('/').last, title: 'Bright listing near the park'));
    }
    if (path == '/content' && request.url.queryParameters['kind'] == 'HELP') {
      if (helpFails) return jsonResponse({'title': 'Unavailable'}, 400);
      return jsonResponse({
        'items': [
          {
            'slug': 'help-booking',
            'version': 1,
            'title': 'How do I book a stay?',
            'summary': 'Choose dates, then confirm your booking.',
            'status': 'DRAFT',
            'kind': 'HELP',
          },
        ],
      });
    }
    if (path == '/content/terms') {
      return jsonResponse({
        'slug': 'terms',
        'version': 1,
        'title': 'Terms & Conditions',
        'summary': '',
        'body': '## Using Westayplace\nPlease read these terms.',
        'status': 'DRAFT',
      });
    }
    return null;
  }
}

Future<_Backend> _pumpApp(WidgetTester tester, {_Backend? backend}) async {
  final api = backend ?? _Backend();
  tester.view
    ..physicalSize = const Size(430, 932)
    ..devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        clockProvider.overrideWithValue(() => _now),
        authRepositoryProvider.overrideWithValue(FakeAuth()),
        apiClientProvider.overrideWithValue(
          ApiClient(client: routedClient(api.handle, log: api.requests), baseUrl: 'http://test'),
        ),
      ],
      child: const CustomerApp(showSplash: false),
    ),
  );
  await tester.pumpAndSettle();
  return api;
}

Future<void> _openShortcut(WidgetTester tester, String label) async {
  await tester.dragUntilVisible(find.text(label), find.byType(HomeCategoryRow), const Offset(-120, 0));
  await tester.pumpAndSettle();
  await tester.tap(find.text(label));
  await tester.pumpAndSettle();
}

Future<void> _search(WidgetTester tester) async {
  await tester.tap(find.widgetWithText(FilledButton, 'Search'));
  await tester.pumpAndSettle();
}

void main() {
  group('Home', () {
    testWidgets('category row shows SVG rental shortcuts and Buy, without Explore', (tester) async {
      await _pumpApp(tester);

      expect(find.byType(SvgPicture), findsNWidgets(6));
      expect(find.text('Explore'), findsNothing);
      for (final label in ['Home', 'Saved', 'Bookings', 'Messages', 'Profile']) {
        expect(find.text(label), findsWidgets, reason: label);
      }
    });

    testWidgets('the hero carousel swipes to the next editorial card', (tester) async {
      await _pumpApp(tester);
      expect(find.bySemanticsLabel('Slide 1 of 4'), findsOneWidget);

      await tester.drag(find.text('Explore Homes'), const Offset(-400, 0));
      await tester.pumpAndSettle();

      expect(find.bySemanticsLabel('Slide 2 of 4'), findsOneWidget);
      expect(find.text('Homes for sale'), findsOneWidget);
    });

    for (final (label, title) in [
      ('Apartment', 'Apartment stays'),
      ('Condo', 'Condo stays'),
      ('House', 'House stays'),
      ('Room', 'Room stays'),
      ('Boarding House', 'Boarding House stays'),
    ]) {
      testWidgets('$label opens the reusable stay search for that category', (tester) async {
        await _pumpApp(tester);
        await _openShortcut(tester, label);

        expect(find.byType(StaySearchScreen), findsOneWidget);
        expect(tester.widget<StaySearchScreen>(find.byType(StaySearchScreen)).category?.label, label);
        expect(find.text(title), findsOneWidget);
        expect(find.text('Buy'), findsNothing);
        expect(find.textContaining('Search short stays'), findsNothing);
      });
    }

    testWidgets('Buy opens the dedicated sale journey and never the stay search', (tester) async {
      await _pumpApp(tester);
      await _openShortcut(tester, 'Buy');

      expect(find.byType(BuySearchScreen), findsOneWidget);
      expect(find.byType(StaySearchScreen), findsNothing);
      for (final rental in ['Short stay', 'Monthly stay', 'Check-in', 'Check-out', 'Guests']) {
        expect(find.text(rental), findsNothing, reason: rental);
      }
      expect(find.text(kPriceOnInquiry), findsWidgets);
      expect(find.textContaining('₱'), findsNothing);
    });
  });

  group('Stay search', () {
    testWidgets('short stay shows dates and guests, monthly shows move-in and occupants', (tester) async {
      await _pumpApp(tester);
      await _openShortcut(tester, 'Condo');

      expect(find.text('Check-in'), findsOneWidget);
      expect(find.text('Check-out'), findsOneWidget);
      expect(find.text('Guests'), findsOneWidget);
      expect(find.text('Fri, 16 Oct 2026'), findsOneWidget);

      await tester.tap(find.text('Monthly stay'));
      await tester.pumpAndSettle();

      expect(find.text('Move-in date'), findsOneWidget);
      expect(find.text('Occupants'), findsOneWidget);
      expect(find.text('Check-in'), findsNothing);
    });

    testWidgets('boarding houses only offer a monthly stay', (tester) async {
      await _pumpApp(tester);
      await _openShortcut(tester, 'Boarding House');

      expect(find.text('Short stay'), findsNothing);
      expect(find.text('Move-in date'), findsOneWidget);
      expect(find.text('Occupants'), findsOneWidget);
    });

    testWidgets('Search opens a results page with the exact short-stay request, and back keeps the form',
        (tester) async {
      final backend = await _pumpApp(tester);
      await _openShortcut(tester, 'Condo');
      await tester.tap(find.byIcon(Icons.add));
      await tester.pumpAndSettle();

      await _search(tester);

      expect(find.byType(StayResultsScreen), findsOneWidget);
      expect(find.text('Fri, 16 Oct  Mon, 19 Oct · 3 guests'), findsOneWidget);
      expect(find.text('1 condo'), findsOneWidget);
      final request = backend.searches.last.url.queryParameters;
      expect(request['intent'], 'RENT');
      expect(request['propertyType'], 'CONDO');
      expect(request['kind'], 'SHORT_TERM');
      expect(request['checkIn'], '2026-10-16');
      expect(request['checkOut'], '2026-10-19');
      expect(request['guests'], '3');

      await tester.tap(find.text('Bright CONDO near the park'));
      await tester.pumpAndSettle();
      expect(find.byType(ListingDetailScreen), findsOneWidget);

      GoRouter.of(tester.element(find.byType(ListingDetailScreen))).pop();
      await tester.pumpAndSettle();
      expect(find.byType(StayResultsScreen), findsOneWidget);

      await tester.tap(find.text('Edit'));
      await tester.pumpAndSettle();
      expect(find.byType(StaySearchScreen), findsOneWidget);
      expect(find.text('3'), findsOneWidget);
    });

    testWidgets('monthly search requests long-term listings from the move-in date', (tester) async {
      final backend = await _pumpApp(tester);
      await _openShortcut(tester, 'Apartment');
      await tester.tap(find.text('Monthly stay'));
      await tester.pumpAndSettle();

      await _search(tester);

      final request = backend.searches.last.url.queryParameters;
      expect(request['propertyType'], 'APARTMENT');
      expect(request['kind'], 'LONG_TERM');
      expect(request['moveIn'], '2026-10-23');
      expect(request['guests'], '1');
      expect(request.containsKey('checkIn'), isFalse);
      expect(find.text('Move in Fri, 23 Oct · 1 occupant'), findsOneWidget);
    });

    testWidgets('an empty search shows an honest empty state', (tester) async {
      final backend = _Backend()..listings = (request) => jsonResponse(listingPageJson(const []));
      await _pumpApp(tester, backend: backend);
      await _openShortcut(tester, 'Room');
      await _search(tester);

      expect(find.text('No rooms match yet'), findsOneWidget);
      expect(find.byType(StayResultsScreen), findsOneWidget);
    });

    testWidgets('a failed search shows a retryable error and never sample listings', (tester) async {
      var fail = true;
      final backend = _Backend()
        ..listings = (request) => fail
            ? jsonResponse({'title': 'Bad request'}, 400)
            : jsonResponse(listingPageJson([rentListingJson(id: 'rent-house', title: 'Recovered house')]));
      await _pumpApp(tester, backend: backend);
      await _openShortcut(tester, 'House');
      await _search(tester);

      expect(find.text('Couldn’t load houses'), findsOneWidget);
      expect(find.byType(Card), findsNothing);

      fail = false;
      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();
      expect(find.text('Recovered house'), findsOneWidget);
    });

    testWidgets('changing the sort on results re-queries with the same stay criteria', (tester) async {
      final backend = await _pumpApp(tester);
      await _openShortcut(tester, 'Condo');
      await _search(tester);

      await tester.tap(find.text('Sort'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Newest'));
      await tester.pumpAndSettle();

      final request = backend.searches.last.url.queryParameters;
      expect(request['sort'], 'NEWEST');
      expect(request['checkIn'], '2026-10-16');
      expect(request['propertyType'], 'CONDO');
    });

    testWidgets('the map button opens the location picker and currency opens its sheet', (tester) async {
      await _pumpApp(tester);
      await _openShortcut(tester, 'Condo');

      await tester.tap(find.bySemanticsLabel(RegExp('^Location: ')));
      await tester.pumpAndSettle();
      expect(find.text('Where are you looking?'), findsOneWidget);
      await tester.tapAt(const Offset(20, 20));
      await tester.pumpAndSettle();

      await tester.tap(find.bySemanticsLabel(RegExp('^Currency: ')));
      await tester.pumpAndSettle();
      expect(find.text('Philippine peso (PHP)'), findsOneWidget);
    });
  });

  group('Stay content', () {
    testWidgets('pre-search content is editorial, FAQ, terms and why book, with no property feed', (tester) async {
      await _pumpApp(tester);
      await _openShortcut(tester, 'Condo');

      expect(find.text('Weekend getaways'), findsOneWidget);
      expect(find.textContaining('Recommended'), findsNothing);

      final scrollable = find.byType(Scrollable).first;
      await tester.scrollUntilVisible(find.text('How do I book a stay?'), 200, scrollable: scrollable);
      expect(find.text('How do I book a stay?'), findsOneWidget);

      await tester.scrollUntilVisible(find.text('A platform made for you.'), 200, scrollable: scrollable);
      expect(find.text('Reliable customer support'), findsOneWidget);
      expect(
        find.descendant(of: find.byType(WhyBookSection), matching: find.byType(ExpansionTile)),
        findsNothing,
      );
      expect(
        find.descendant(of: find.byType(WhyBookSection), matching: find.byIcon(Icons.chevron_right_rounded)),
        findsNothing,
      );
    });

    testWidgets('FAQ failure is explained with a retry and terms still open', (tester) async {
      final backend = _Backend()..helpFails = true;
      await _pumpApp(tester, backend: backend);
      await _openShortcut(tester, 'Condo');

      final scrollable = find.byType(Scrollable).first;
      await tester.scrollUntilVisible(find.text('Questions are unavailable right now.'), 200, scrollable: scrollable);
      expect(find.text('Retry'), findsOneWidget);

      await tester.scrollUntilVisible(find.text('Reliable customer support'), 200, scrollable: scrollable);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Terms & Conditions'));
      await tester.pumpAndSettle();
      expect(find.byType(DraggableScrollableSheet), findsOneWidget);
      expect(find.text('Please read these terms.'), findsOneWidget);
    });

    testWidgets('editorial calls to action switch mode in place or open a real destination', (tester) async {
      final backend = await _pumpApp(tester);
      await _openShortcut(tester, 'Condo');

      await tester.drag(find.text('Weekend getaways'), const Offset(-400, 0));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Search monthly'));
      await tester.pumpAndSettle();
      expect(find.text('Move-in date'), findsOneWidget);

      await tester.drag(find.text('Settle in for the month'), const Offset(-400, 0));
      await tester.pumpAndSettle();
      await tester.tap(find.text('See 360° tours'));
      await tester.pumpAndSettle();

      expect(find.byType(RentSearchScreen), findsOneWidget);
      final request = backend.requests.lastWhere((r) => r.url.path == '/listings').url.queryParameters;
      expect(request['hasTour'], 'true');
      expect(request['propertyType'], 'CONDO');
    });
  });
}
