import 'dart:async';

import 'package:customer_app/app/clock.dart';
import 'package:customer_app/app/router.dart';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/data/offline_cache.dart';
import 'package:customer_app/data/preferences_store.dart';
import 'package:customer_app/features/editorial/application/editorial_content.dart';
import 'package:customer_app/features/editorial/domain/editorial_card.dart';
import 'package:customer_app/features/editorial/presentation/editorial_routes.dart';
import 'package:customer_app/features/explore/application/explore_controller.dart';
import 'package:customer_app/features/explore/application/explore_results.dart';
import 'package:customer_app/features/explore/application/stay_search_controller.dart';
import 'package:customer_app/features/explore/domain/explore_query.dart';
import 'package:customer_app/features/explore/domain/explore_query_codec.dart';
import 'package:customer_app/features/explore/domain/listing_category.dart';
import 'package:customer_app/features/explore/domain/stay_search_policy.dart';
import 'package:customer_app/features/location/location_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'support/listing_json.dart';

final _now = DateTime(2026, 10, 9, 15, 30);

class _DeniedGateway implements LocationGateway {
  @override
  Future<bool> hasPermission() async => false;

  @override
  Future<LocationOutcome> currentPosition() async => const LocationOutcome(LocationAccess.denied);

  @override
  Future<void> openSettings(LocationAccess access) async {}
}

ProviderContainer _container({RouteHandler? handler, List<http.Request>? log, PreferencesStore? store}) {
  final container = ProviderContainer(
    overrides: [
      clockProvider.overrideWithValue(() => _now),
      preferencesStoreProvider.overrideWithValue(store ?? MemoryPreferencesStore()),
      locationGatewayProvider.overrideWithValue(_DeniedGateway()),
      if (handler != null)
        apiClientProvider.overrideWithValue(
          ApiClient(client: routedClient(handler, log: log), baseUrl: 'http://test'),
        ),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

Future<void> _settle() => Future<void>.delayed(Duration.zero);

void main() {
  const condo = (category: ListingCategory.condo, mode: null);
  const boarding = (category: ListingCategory.boardingHouse, mode: null);

  group('Stay search policy', () {
    test('defaults are derived from today in one place', () {
      expect(StaySearchPolicy.defaultCheckIn(_now), DateTime(2026, 10, 16));
      expect(StaySearchPolicy.defaultCheckOut(_now), DateTime(2026, 10, 19));
      expect(StaySearchPolicy.defaultMoveIn(_now), DateTime(2026, 10, 23));
      expect(StaySearchPolicy.firstBookableDay(_now), DateTime(2026, 10, 9));
      expect(StaySearchPolicy.lastBookableDay(_now), DateTime(2027, 10, 9));
    });

    test('initial mode honours a supported request and falls back otherwise', () {
      expect(StaySearchPolicy.initialMode(RentMode.values, RentMode.monthly), RentMode.monthly);
      expect(StaySearchPolicy.initialMode(const [RentMode.monthly], RentMode.shortStay), RentMode.monthly);
      expect(StaySearchPolicy.initialMode(RentMode.values, null), RentMode.shortStay);
    });
  });

  group('Stay search controller', () {
    test('starts from the policy defaults for the category', () {
      final state = _container().read(staySearchProvider(condo));
      expect(state.category, ListingCategory.condo);
      expect(state.mode, RentMode.shortStay);
      expect(state.checkIn, DateTime(2026, 10, 16));
      expect(state.checkOut, DateTime(2026, 10, 19));
      expect(state.guests, StaySearchPolicy.defaultGuests);
      expect(state.offersModeChoice, isTrue);
    });

    test('a boarding house only offers monthly stays and ignores short stay', () {
      final container = _container();
      container.read(staySearchProvider(boarding).notifier).setMode(RentMode.shortStay);
      final state = container.read(staySearchProvider(boarding));
      expect(state.mode, RentMode.monthly);
      expect(state.offersModeChoice, isFalse);
    });

    test('a valid short stay produces the exact category, mode, dates and guests', () {
      final container = _container();
      final controller = container.read(staySearchProvider(condo).notifier)
        ..setShortStayDates(DateTime(2026, 11, 2, 18), DateTime(2026, 11, 5))
        ..setGuests(3);
      final query = controller.search();
      expect(query, isNotNull);
      expect(query!.category, ListingCategory.condo);
      expect(query.rentMode, RentMode.shortStay);
      expect(query.stay, ShortStaySearch(checkIn: DateTime(2026, 11, 2), checkOut: DateTime(2026, 11, 5), guests: 3));
      expect(container.read(staySearchProvider(condo)).validationError, isNull);
    });

    test('check-out on or before check-in is pushed to the next day', () {
      final container = _container();
      container
          .read(staySearchProvider(condo).notifier)
          .setShortStayDates(DateTime(2026, 11, 2), DateTime(2026, 11, 2));
      expect(container.read(staySearchProvider(condo)).checkOut, DateTime(2026, 11, 3));
    });

    test('past dates are rejected with a message and no query', () {
      final container = _container();
      final controller = container.read(staySearchProvider(condo).notifier)
        ..setShortStayDates(DateTime(2026, 10, 1), DateTime(2026, 10, 3));
      expect(controller.search(), isNull);
      expect(container.read(staySearchProvider(condo)).validationError, 'Check-in can’t be in the past');
    });

    test('guests and occupants are kept within the allowed range', () {
      final container = _container();
      final controller = container.read(staySearchProvider(condo).notifier)
        ..setGuests(0)
        ..setOccupants(99);
      final state = container.read(staySearchProvider(condo));
      expect(state.guests, 1);
      expect(state.occupants, 16);
      expect(controller.search(), isNotNull);
    });

    test('monthly search carries move-in and occupants and no short-stay dates', () {
      final container = _container();
      final controller = container.read(staySearchProvider(condo).notifier)
        ..setShortStayDates(DateTime(2026, 11, 2), DateTime(2026, 11, 5))
        ..setGuests(4)
        ..setMode(RentMode.monthly)
        ..setMoveIn(DateTime(2026, 12, 1))
        ..setOccupants(2);
      final query = controller.search()!;
      expect(query.rentMode, RentMode.monthly);
      expect(query.stay, MonthlySearch(moveIn: DateTime(2026, 12, 1), occupants: 2));
      final encoded = ExploreQueryCodec.encode(query);
      expect(encoded.containsKey('checkIn'), isFalse);
      expect(encoded['occupants'], '2');
    });

    test('a past move-in is rejected', () {
      final container = _container();
      final controller = container.read(staySearchProvider(condo).notifier)
        ..setMode(RentMode.monthly)
        ..setMoveIn(DateTime(2026, 10, 1));
      expect(controller.search(), isNull);
      expect(container.read(staySearchProvider(condo)).validationError, 'Move-in can’t be in the past');
    });

    test('changing a field clears the previous validation error and reset restores defaults', () {
      final container = _container();
      final controller = container.read(staySearchProvider(condo).notifier)
        ..setShortStayDates(DateTime(2026, 10, 1), DateTime(2026, 10, 3));
      controller.search();
      controller.setGuests(5);
      expect(container.read(staySearchProvider(condo)).validationError, isNull);
      controller.resetSearch();
      expect(container.read(staySearchProvider(condo)).guests, StaySearchPolicy.defaultGuests);
      expect(container.read(staySearchProvider(condo)).checkIn, DateTime(2026, 10, 16));
    });
  });

  group('Search route codec', () {
    test('a stay query survives the route round trip', () {
      final query = ExploreQuery(
        category: ListingCategory.room,
        rentMode: RentMode.shortStay,
        stay: ShortStaySearch(checkIn: DateTime(2026, 11, 2), checkOut: DateTime(2026, 11, 5), guests: 2),
        quickFilters: const {QuickFilter.petFriendly, QuickFilter.furnished},
        sort: ExploreSort.newest,
      );
      final uri = Uri.parse(Routes.stayResults(query));
      expect(uri.path, '/discover/stays/results');
      expect(ExploreQueryCodec.decode(uri.queryParameters, MarketIntent.rent), query);
    });

    test('a buy route never carries rental stay criteria', () {
      final decoded = ExploreQueryCodec.decode(
        {'category': 'house', 'checkIn': '2026-11-02', 'checkOut': '2026-11-05', 'guests': '2', 'mode': 'monthly'},
        MarketIntent.buy,
      );
      expect(decoded.isBuy, isTrue);
      expect(decoded.stay, isNull);
      expect(decoded.rentMode, isNull);
      expect(decoded.category, ListingCategory.house);
    });

    test('rental shortcuts route to stays and buy routes to the dedicated buy journey', () {
      expect(Uri.parse(Routes.stays(category: ListingCategory.condo)).path, Routes.staysPath);
      expect(Uri.parse(Routes.buy()).path, Routes.buyPath);
      expect(Routes.buy(), isNot(contains('stays')));
    });
  });

  group('Editorial content', () {
    test('every card routes to a real destination', () {
      for (final placement in EditorialPlacement.values) {
        for (final category in [null, ...ListingCategory.forIntent(MarketIntent.rent)]) {
          for (final card in EditorialContent.cardsFor((placement: placement, category: category))) {
            final route = Uri.parse(editorialRoute(card.action, category: category));
            expect(route.path, startsWith('/'), reason: card.id);
          }
        }
      }
    });

    test('stay cards never promise short stays for monthly-only categories', () {
      final cards = EditorialContent.cardsFor(
          (placement: EditorialPlacement.staySearch, category: ListingCategory.boardingHouse));
      expect(cards.map((c) => c.action), isNot(contains(EditorialAction.shortStays)));
      expect(cards.map((c) => c.action), contains(EditorialAction.monthlyStays));
    });

    test('editorial copy contains no discounts, scarcity or popularity claims', () {
      final banned = RegExp(r'%|off\b|limited|only \d|left|popular|discount|deal', caseSensitive: false);
      for (final placement in EditorialPlacement.values) {
        for (final card in EditorialContent.cardsFor((placement: placement, category: ListingCategory.condo))) {
          for (final text in [card.title, card.body, card.actionLabel, card.eyebrow ?? '']) {
            expect(banned.hasMatch(text), isFalse, reason: text);
          }
        }
      }
    });
  });

  group('Results session', () {
    final seed = ExploreQuery(
      category: ListingCategory.condo,
      rentMode: RentMode.shortStay,
      stay: ShortStaySearch(checkIn: DateTime(2026, 10, 16), checkOut: DateTime(2026, 10, 19), guests: 2),
    );

    test('the request carries the current query, including a changed sort', () async {
      final log = <http.Request>[];
      final container = _container(
        handler: (request) => jsonResponse(listingPageJson([rentListingJson(id: 'a')])),
        log: log,
      );
      final sub = container.listen(exploreResultsProvider(seed), (_, __) {});
      addTearDown(sub.close);
      await container.read(exploreResultsProvider(seed).future);
      final first = log.single.url.queryParameters;
      expect(first['propertyType'], 'CONDO');
      expect(first['kind'], 'SHORT_TERM');
      expect(first['checkIn'], '2026-10-16');
      expect(first['checkOut'], '2026-10-19');
      expect(first['guests'], '2');

      container.read(exploreQueryProvider(seed).notifier).setSort(ExploreSort.newest);
      await container.read(exploreResultsProvider(seed).future);
      expect(log.last.url.queryParameters['sort'], 'NEWEST');
      expect(log.last.url.queryParameters['checkIn'], '2026-10-16');
    });

    test('concurrent load-more calls fetch the next page only once', () async {
      final nextPage = Completer<http.Response>();
      final log = <http.Request>[];
      final container = _container(
        handler: (request) => request.url.queryParameters['offset'] == '0'
            ? jsonResponse(listingPageJson([rentListingJson(id: 'a')], total: 2, hasMore: true))
            : nextPage.future,
        log: log,
      );
      final sub = container.listen(exploreResultsProvider(seed), (_, __) {});
      addTearDown(sub.close);
      await container.read(exploreResultsProvider(seed).future);

      final notifier = container.read(exploreResultsProvider(seed).notifier);
      final first = notifier.loadMore();
      final second = notifier.loadMore();
      nextPage.complete(jsonResponse(listingPageJson([rentListingJson(id: 'b')], total: 2)));
      await Future.wait([first, second]);

      expect(log.where((r) => r.url.queryParameters['offset'] == '1'), hasLength(1));
      expect(container.read(exploreResultsProvider(seed)).requireValue.items.map((l) => l.id), ['a', 'b']);
    });

    test('no further page is requested after the last page', () async {
      final log = <http.Request>[];
      final container = _container(
        handler: (request) => jsonResponse(listingPageJson([rentListingJson(id: 'a')])),
        log: log,
      );
      final sub = container.listen(exploreResultsProvider(seed), (_, __) {});
      addTearDown(sub.close);
      await container.read(exploreResultsProvider(seed).future);
      await container.read(exploreResultsProvider(seed).notifier).loadMore();
      expect(log, hasLength(1));
    });

    test('a page arriving after the session was disposed is dropped', () async {
      final nextPage = Completer<http.Response>();
      final container = _container(
        handler: (request) => request.url.queryParameters['offset'] == '0'
            ? jsonResponse(listingPageJson([rentListingJson(id: 'a')], total: 2, hasMore: true))
            : nextPage.future,
      );
      final sub = container.listen(exploreResultsProvider(seed), (_, __) {});
      await container.read(exploreResultsProvider(seed).future);
      final loading = container.read(exploreResultsProvider(seed).notifier).loadMore();
      sub.close();
      await _settle();
      nextPage.complete(jsonResponse(listingPageJson([rentListingJson(id: 'late')], total: 2)));
      await loading;
    });

    test('an empty result is a real empty state, never filled with samples', () async {
      final container = _container(handler: (request) => jsonResponse(listingPageJson(const [])));
      final sub = container.listen(exploreResultsProvider(seed), (_, __) {});
      addTearDown(sub.close);
      final page = await container.read(exploreResultsProvider(seed).future);
      expect(page.items, isEmpty);
      expect(page.total, 0);
    });
  });

  group('Offline cache isolation', () {
    test('a saved Condo search is never served for House or for Buy', () async {
      final store = MemoryPreferencesStore();
      final online = _container(
        handler: (request) => jsonResponse(listingPageJson([rentListingJson(id: 'condo-saved')])),
        store: store,
      );
      await online
          .read(listingRepositoryProvider)
          .watchSearch(const ExploreQuery(category: ListingCategory.condo))
          .first;

      final offline = _container(handler: (request) => throw const _Offline(), store: store);
      final repository = offline.read(listingRepositoryProvider);
      final condo = await repository.watchSearch(const ExploreQuery(category: ListingCategory.condo)).first;
      expect(condo.items.single.id, 'condo-saved');

      await expectLater(
        repository.watchSearch(const ExploreQuery(category: ListingCategory.house)).first,
        throwsA(isA<ApiException>()),
      );
      await expectLater(
        repository.watchSearch(const ExploreQuery(intent: MarketIntent.buy, category: ListingCategory.condo)).first,
        throwsA(isA<ApiException>()),
      );
    });

    test('expired or older-format entries are ignored', () async {
      final store = MemoryPreferencesStore();
      var now = DateTime(2026, 10, 9);
      final cache = OfflineCache(store, now: () => now, maxAge: const Duration(days: 7));
      await cache.write('k', {'v': 1});
      expect(await cache.read('k'), {'v': 1});
      now = now.add(const Duration(days: 8));
      expect(await cache.read('k'), isNull);
      await store.write('offline_cache.entry.old', '{"items":[]}');
      expect(await cache.read('old'), isNull);
    });

    test('searches near the device position are not written to disk', () async {
      final store = MemoryPreferencesStore();
      final container = _container(
        handler: (request) => jsonResponse(listingPageJson([rentListingJson(id: 'near')])),
        store: store,
      );
      await container
          .read(listingRepositoryProvider)
          .watchSearch(
            const ExploreQuery(),
            place: NearMePlace(const DevicePosition(latitude: 7.07, longitude: 125.61), capturedAt: _now),
          )
          .first;
      expect(await store.readList('offline_cache.index'), isEmpty);
      expect(isPersistable({'lat': '7.070'}), isFalse);
    });

    test('leaving a screen while offline stops the retry loop', () async {
      var calls = 0;
      final cache = OfflineCache(MemoryPreferencesStore());
      final subscription = cacheThenNetwork<Object?>(
        cache: cache,
        key: 'k',
        fetch: () async {
          calls++;
          throw const ApiException('offline', isNetwork: true);
        },
        decode: (body) => body,
        retryDelays: const [Duration(milliseconds: 5)],
      ).listen((_) {}, onError: (_) {});
      await Future<void>.delayed(const Duration(milliseconds: 30));
      await subscription.cancel();
      final afterCancel = calls;
      await Future<void>.delayed(const Duration(milliseconds: 40));
      expect(calls, afterCancel);
    });
  });
}

class _Offline implements Exception {
  const _Offline();
}
