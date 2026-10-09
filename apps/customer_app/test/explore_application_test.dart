import 'dart:async';

import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/data/offline_cache.dart';
import 'package:customer_app/data/preferences_store.dart';
import 'package:customer_app/features/explore/application/explore_controller.dart';
import 'package:customer_app/features/explore/application/explore_results.dart';
import 'package:customer_app/features/explore/application/search_suggestions.dart';
import 'package:customer_app/features/explore/domain/explore_query.dart';
import 'package:customer_app/features/explore/domain/listing_category.dart';
import 'package:customer_app/features/listing/listing_price.dart';
import 'package:customer_app/features/location/location_controller.dart';
import 'package:customer_app/fixtures/view_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'support/listing_json.dart';

class _Harness {
  _Harness(RouteHandler handler, {LocationGateway? gateway, PreferencesStore? store}) {
    final api = ApiClient(client: routedClient(handler, log: requests), baseUrl: 'http://test');
    container = ProviderContainer(
      overrides: [
        apiClientProvider.overrideWithValue(api),
        preferencesStoreProvider.overrideWithValue(store ?? MemoryPreferencesStore()),
        locationGatewayProvider.overrideWithValue(gateway ?? FakeLocationGateway.noPermission()),
      ],
    );
  }

  final List<http.Request> requests = [];
  late final ProviderContainer container;

  List<http.Request> get listingRequests => requests.where((r) => r.url.path == '/listings').toList();

  void dispose() => container.dispose();
}

class FakeLocationGateway implements LocationGateway {
  FakeLocationGateway(this.outcome, {this.permitted = true});

  factory FakeLocationGateway.noPermission() =>
      FakeLocationGateway(const LocationOutcome(LocationAccess.denied), permitted: false);

  final LocationOutcome outcome;
  final bool permitted;
  Completer<void>? gate;
  int positionRequests = 0;
  LocationAccess? openedFor;

  @override
  Future<bool> hasPermission() async => permitted;

  @override
  Future<LocationOutcome> currentPosition() async {
    positionRequests++;
    await gate?.future;
    return outcome;
  }

  @override
  Future<void> openSettings(LocationAccess access) async => openedFor = access;
}

const _davao = DevicePosition(latitude: 7.0731, longitude: 125.6128);

Future<void> _settle() => Future<void>.delayed(Duration.zero);

class _Offline implements Exception {
  const _Offline();
}

void main() {
  const rentSeed = ExploreQuery();
  const buySeed = ExploreQuery(intent: MarketIntent.buy);

  group('Explore results', () {
    test('loads the first page then appends the next without duplicates', () async {
      final harness = _Harness((request) {
        final offset = request.url.queryParameters['offset'];
        if (request.url.path != '/listings') return null;
        return offset == '0'
            ? jsonResponse(
                listingPageJson([rentListingJson(id: 'a'), rentListingJson(id: 'b')], total: 3, hasMore: true))
            : jsonResponse(listingPageJson([rentListingJson(id: 'b'), rentListingJson(id: 'c')], total: 3));
      });
      addTearDown(harness.dispose);
      final sub = harness.container.listen(exploreResultsProvider(rentSeed), (_, __) {});
      addTearDown(sub.close);

      final first = await harness.container.read(exploreResultsProvider(rentSeed).future);
      expect(first.items.map((l) => l.id), ['a', 'b']);
      expect(first.hasMore, isTrue);

      await harness.container.read(exploreResultsProvider(rentSeed).notifier).loadMore();
      final next = harness.container.read(exploreResultsProvider(rentSeed)).requireValue;
      expect(next.items.map((l) => l.id), ['a', 'b', 'c']);
      expect(next.hasMore, isFalse);
      expect(harness.listingRequests.last.url.queryParameters['offset'], '2');
    });

    test('a failure with nothing saved surfaces as an error and never as sample listings', () async {
      final harness = _Harness((request) => jsonResponse({'title': 'Bad request'}, 400));
      addTearDown(harness.dispose);
      final sub = harness.container.listen(exploreResultsProvider(buySeed), (_, __) {});
      addTearDown(sub.close);

      await expectLater(harness.container.read(exploreResultsProvider(buySeed).future), throwsA(isA<ApiException>()));
      final state = harness.container.read(exploreResultsProvider(buySeed));
      expect(state.hasError, isTrue);
      expect(state.valueOrNull, isNull);
    });

    test('Buy results never expose a sale price even if the server sends one', () async {
      final harness = _Harness(
        (request) => jsonResponse(listingPageJson([saleListingJson(priceCentavos: 1850000000)])),
      );
      addTearDown(harness.dispose);
      final sub = harness.container.listen(exploreResultsProvider(buySeed), (_, __) {});
      addTearDown(sub.close);

      final page = await harness.container.read(exploreResultsProvider(buySeed).future);
      final card = page.items.single;
      expect(card.isSale, isTrue);
      expect(card.priceCentavos, isNull);
      expect(listingPriceLabel(card), kPriceOnInquiry);
      expect(harness.listingRequests.single.url.queryParameters['intent'], 'SALE');
    });

    test('rent and buy searches are separate and never share state', () async {
      final harness = _Harness((request) {
        final sale = request.url.queryParameters['intent'] == 'SALE';
        return jsonResponse(listingPageJson([sale ? saleListingJson(id: 'sale') : rentListingJson(id: 'rent')]));
      });
      addTearDown(harness.dispose);
      final rentSub = harness.container.listen(exploreResultsProvider(rentSeed), (_, __) {});
      final buySub = harness.container.listen(exploreResultsProvider(buySeed), (_, __) {});
      addTearDown(rentSub.close);
      addTearDown(buySub.close);

      harness.container.read(exploreQueryProvider(rentSeed).notifier).setCategory(ListingCategory.room);
      final rent = await harness.container.read(exploreResultsProvider(rentSeed).future);
      final buy = await harness.container.read(exploreResultsProvider(buySeed).future);

      expect(rent.items.single.id, 'rent');
      expect(buy.items.single.id, 'sale');
      expect(harness.container.read(exploreQueryProvider(buySeed)).category, isNull);
      expect(harness.container.read(exploreQueryProvider(rentSeed)).category, ListingCategory.room);
    });

    test('quickly changing the category keeps only the latest results', () async {
      final pending = <String, Completer<http.Response>>{};
      final harness = _Harness((request) {
        final key = request.url.queryParameters['propertyType'] ?? 'ALL';
        return (pending[key] = Completer<http.Response>()).future;
      });
      addTearDown(harness.dispose);
      final controller = harness.container.read(exploreQueryProvider(rentSeed).notifier);
      final sub = harness.container.listen(exploreResultsProvider(rentSeed), (_, __) {});
      addTearDown(sub.close);

      await _settle();
      controller.setCategory(ListingCategory.condo);
      harness.container.read(exploreResultsProvider(rentSeed));
      await _settle();
      controller.setCategory(ListingCategory.room);
      final latest = harness.container.read(exploreResultsProvider(rentSeed).future);
      await _settle();

      pending['ROOM']!.complete(jsonResponse(listingPageJson([rentListingJson(id: 'room')])));
      pending['CONDO']!.complete(jsonResponse(listingPageJson([rentListingJson(id: 'condo')])));
      pending['ALL']!.complete(jsonResponse(listingPageJson([rentListingJson(id: 'all')])));
      await _settle();

      expect((await latest).items.map((l) => l.id), ['room']);
      expect(harness.container.read(exploreResultsProvider(rentSeed)).requireValue.items.map((l) => l.id), ['room']);
    });

    test('a page that arrives after the query changed is discarded', () async {
      final nextPage = Completer<http.Response>();
      final harness = _Harness((request) {
        if (request.url.queryParameters['offset'] != '0') return nextPage.future;
        return jsonResponse(listingPageJson([rentListingJson(id: 'a')], total: 2, hasMore: true));
      });
      addTearDown(harness.dispose);
      final sub = harness.container.listen(exploreResultsProvider(rentSeed), (_, __) {});
      addTearDown(sub.close);
      await harness.container.read(exploreResultsProvider(rentSeed).future);

      final loading = harness.container.read(exploreResultsProvider(rentSeed).notifier).loadMore();
      harness.container.read(exploreQueryProvider(rentSeed).notifier).setCategory(ListingCategory.condo);
      nextPage.complete(jsonResponse(listingPageJson([rentListingJson(id: 'stale')], total: 2)));
      await loading;

      final current = await harness.container.read(exploreResultsProvider(rentSeed).future);
      expect(current.items.map((l) => l.id), isNot(contains('stale')));
    });

    test('saved results show offline instead of an error', () async {
      final store = MemoryPreferencesStore();
      final online = _Harness((request) => jsonResponse(listingPageJson([rentListingJson(id: 'saved')])), store: store);
      final sub = online.container.listen(exploreResultsProvider(rentSeed), (_, __) {});
      await online.container.read(exploreResultsProvider(rentSeed).future);
      sub.close();
      online.dispose();

      final offline = _Harness((request) => throw const _Offline(), store: store);
      addTearDown(offline.dispose);
      final offlineSub = offline.container.listen(exploreResultsProvider(rentSeed), (_, __) {});
      addTearDown(offlineSub.close);

      final page = await offline.container.read(exploreResultsProvider(rentSeed).future);
      expect(page.items.single.id, 'saved');
      expect(offline.container.read(exploreResultsProvider(rentSeed)).hasError, isFalse);
    });
  });

  group('Explore query controller', () {
    test('a rent search ignores buy-only categories and buy refinements', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      container.read(exploreQueryProvider(rentSeed).notifier)
        ..setCategory(ListingCategory.lot)
        ..setBuyRefinement(const BuyRefinement(minBedrooms: 3));
      expect(container.read(exploreQueryProvider(rentSeed)), rentSeed);
    });

    test('a buy search ignores stays, rent prices and pet filters', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      container.read(exploreQueryProvider(buySeed).notifier)
        ..applyStay(MonthlySearch(moveIn: DateTime(2026, 11, 1), occupants: 2))
        ..setMaxPrice(2000000)
        ..toggleQuickFilter(QuickFilter.petFriendly)
        ..setCategory(ListingCategory.room);
      expect(container.read(exploreQueryProvider(buySeed)), buySeed);
    });

    test('applying a monthly stay sets the monthly mode and clearing keeps search context', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final controller = container.read(exploreQueryProvider(rentSeed).notifier)
        ..setCategory(ListingCategory.condo)
        ..setText('Lahug')
        ..applyStay(MonthlySearch(moveIn: DateTime(2026, 11, 1), occupants: 2))
        ..toggleQuickFilter(QuickFilter.furnished);
      expect(container.read(exploreQueryProvider(rentSeed)).rentMode, RentMode.monthly);
      expect(container.read(exploreQueryProvider(rentSeed)).filterCount, 2);

      controller.clearFilters();
      expect(
        container.read(exploreQueryProvider(rentSeed)),
        const ExploreQuery(category: ListingCategory.condo, text: 'Lahug'),
      );
    });

    test('replace only accepts a query for the same intent', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      container.read(exploreQueryProvider(rentSeed).notifier).replace(buySeed);
      expect(container.read(exploreQueryProvider(rentSeed)), rentSeed);
    });
  });

  group('Offline cache', () {
    const key = 'guest|/listings?intent=RENT';
    const fast = [Duration(milliseconds: 5)];

    test('shows saved data first, then quietly replaces it with fresh data', () async {
      final cache = OfflineCache(MemoryPreferencesStore());
      await cache.write(key, {'v': 'saved'});
      final values = await cacheThenNetwork(
        cache: cache,
        key: key,
        fetch: () async => {'v': 'fresh'},
        decode: (body) => body['v'],
        retryDelays: fast,
      ).toList();
      expect(values, ['saved', 'fresh']);
      expect(await cache.read(key), {'v': 'fresh'});
    });

    test('keeps saved data without an error while offline and updates once the connection returns', () async {
      final cache = OfflineCache(MemoryPreferencesStore());
      await cache.write(key, {'v': 'saved'});
      var calls = 0;
      final events = <Object?>[];
      await cacheThenNetwork(
        cache: cache,
        key: key,
        fetch: () async {
          if (calls++ < 2) throw const ApiException('offline', isNetwork: true);
          return {'v': 'fresh'};
        },
        decode: (body) => body['v'],
        retryDelays: fast,
      ).handleError(events.add).forEach(events.add);
      expect(events, ['saved', 'fresh']);
    });

    test('with nothing saved, reports the error once and recovers when online', () async {
      final cache = OfflineCache(MemoryPreferencesStore());
      var calls = 0;
      final events = <Object?>[];
      await cacheThenNetwork(
        cache: cache,
        key: key,
        fetch: () async {
          if (calls++ < 2) throw const ApiException('offline', isNetwork: true);
          return {'v': 'fresh'};
        },
        decode: (body) => body['v'],
        retryDelays: fast,
      ).handleError((Object error) => events.add('error')).forEach(events.add);
      expect(events, ['error', 'fresh']);
    });

    test('a client error is not retried', () async {
      final cache = OfflineCache(MemoryPreferencesStore());
      var calls = 0;
      await expectLater(
        cacheThenNetwork(
          cache: cache,
          key: key,
          fetch: () async {
            calls++;
            throw const ApiException('bad', statusCode: 400);
          },
          decode: (body) => body,
          retryDelays: fast,
        ).toList(),
        throwsA(isA<ApiException>()),
      );
      expect(calls, 1);
    });

    test('evicts the oldest entries beyond capacity and clears everything', () async {
      final cache = OfflineCache(MemoryPreferencesStore(), capacity: 2);
      await cache.write('a', {'v': 1});
      await cache.write('b', {'v': 2});
      await cache.write('c', {'v': 3});
      expect(await cache.read('a'), isNull);
      expect(await cache.read('c'), {'v': 3});
      await cache.clear();
      expect(await cache.read('b'), isNull);
    });

    test('cache keys are stable regardless of parameter order and scoped per user', () {
      expect(cacheKey('u1', '/listings', {'b': '2', 'a': '1', 'c': null}), 'u1|/listings?a=1&b=2');
      expect(cacheKey('u2', '/listings', {'a': '1'}), isNot(cacheKey('u1', '/listings', {'a': '1'})));
    });
  });

  group('Search suggestions', () {
    Map<String, dynamic> suggestionsJson(String q) => {
          'locations': [
            {'cityLabel': 'Davao City', 'areaLabel': null, 'listingCount': 3},
          ],
          'listings': <dynamic>[],
          'categories': <dynamic>[],
          'echo': q,
        };

    test('short text never calls the server', () async {
      final harness = _Harness((request) => jsonResponse(suggestionsJson('x')));
      addTearDown(harness.dispose);
      final result =
          await harness.container.read(searchSuggestionsProvider((text: 'D', intent: MarketIntent.rent)).future);
      expect(result.isEmpty, isTrue);
      expect(harness.requests, isEmpty);
    });

    test('typing quickly only queries the server for the last text', () async {
      final harness = _Harness((request) => jsonResponse(suggestionsJson(request.url.queryParameters['q']!)));
      addTearDown(harness.dispose);

      for (final text in ['Da', 'Dav', 'Dava']) {
        final sub =
            harness.container.listen(searchSuggestionsProvider((text: text, intent: MarketIntent.rent)), (_, __) {});
        await Future<void>.delayed(const Duration(milliseconds: 50));
        sub.close();
        await _settle();
      }
      final sub =
          harness.container.listen(searchSuggestionsProvider((text: 'Davao', intent: MarketIntent.rent)), (_, __) {});
      addTearDown(sub.close);
      final result =
          await harness.container.read(searchSuggestionsProvider((text: 'Davao', intent: MarketIntent.rent)).future);

      expect(result.locations.single.label, 'Davao City');
      final queried = harness.requests.where((r) => r.url.path == '/discovery/suggestions');
      expect(queried.map((r) => r.url.queryParameters['q']), ['Davao']);
      expect(queried.single.url.queryParameters['intent'], 'RENT');
    });

    test('recent searches are de-duplicated, capped and persisted', () async {
      final store = MemoryPreferencesStore();
      final harness = _Harness((_) => null, store: store);
      addTearDown(harness.dispose);
      final recent = harness.container.read(recentSearchesProvider.notifier);
      await _settle();

      for (var i = 0; i < kMaxRecentSearches + 2; i++) {
        await recent.add('Area $i');
      }
      await recent.add('area 9');
      await recent.add(' ');

      final saved = harness.container.read(recentSearchesProvider);
      expect(saved.first, 'area 9');
      expect(saved.length, kMaxRecentSearches);
      expect(saved.where((s) => s.toLowerCase() == 'area 9'), hasLength(1));
      expect(await store.readList(kRecentSearchesKey), saved);

      await recent.clear();
      expect(harness.container.read(recentSearchesProvider), isEmpty);
      expect(await store.readList(kRecentSearchesKey), isEmpty);
    });
  });

  group('Location priority', () {
    http.Response? resolveDavao(http.Request request) => request.url.path == '/discovery/resolve-location'
        ? jsonResponse({
            'place': {'cityLabel': 'Davao City', 'distanceKm': 1.2},
          })
        : null;

    test('a saved city wins over GPS on launch', () async {
      final store = MemoryPreferencesStore();
      await store.write(kPreferredCityKey, 'Cebu City');
      final gateway = FakeLocationGateway(const LocationOutcome(LocationAccess.granted, _davao));
      final harness = _Harness(resolveDavao, gateway: gateway, store: store);
      addTearDown(harness.dispose);

      harness.container.read(locationProvider);
      await _settle();
      await _settle();

      expect(harness.container.read(locationProvider).place, const AreaPlace('Cebu City'));
      expect(gateway.positionRequests, 0);
    });

    test('GPS is used on launch only when permission was already granted', () async {
      final gateway = FakeLocationGateway(const LocationOutcome(LocationAccess.granted, _davao));
      final harness = _Harness(resolveDavao, gateway: gateway);
      addTearDown(harness.dispose);

      harness.container.read(locationProvider);
      for (var i = 0; i < 5; i++) {
        await _settle();
      }

      final state = harness.container.read(locationProvider);
      expect(state.isNearMe, isTrue);
      expect(state.place.label, 'Near you · Davao City');
      expect(state.cityContext, 'Davao City');
    });

    test('without permission the app stays unspecified and never prompts on launch', () async {
      final gateway = FakeLocationGateway.noPermission();
      final harness = _Harness(resolveDavao, gateway: gateway);
      addTearDown(harness.dispose);

      harness.container.read(locationProvider);
      await _settle();

      expect(harness.container.read(locationProvider).isSpecified, isFalse);
      expect(gateway.positionRequests, 0);
    });

    test('an explicit city chosen while GPS is pending is not overwritten', () async {
      final gateway = FakeLocationGateway(const LocationOutcome(LocationAccess.granted, _davao), permitted: false)
        ..gate = Completer<void>();
      final store = MemoryPreferencesStore();
      final harness = _Harness(resolveDavao, gateway: gateway, store: store);
      addTearDown(harness.dispose);
      final controller = harness.container.read(locationProvider.notifier);
      await _settle();

      final locating = controller.useCurrentLocation();
      expect(harness.container.read(locationProvider).locating, isTrue);
      await controller.chooseCity('Cebu City');
      gateway.gate!.complete();
      await locating;

      expect(harness.container.read(locationProvider).place, const AreaPlace('Cebu City'));
      expect(await store.read(kPreferredCityKey), 'Cebu City');
    });

    test('using GPS after choosing a city replaces the saved preference', () async {
      final store = MemoryPreferencesStore();
      final gateway = FakeLocationGateway(const LocationOutcome(LocationAccess.granted, _davao), permitted: false);
      final harness = _Harness(resolveDavao, gateway: gateway, store: store);
      addTearDown(harness.dispose);
      final controller = harness.container.read(locationProvider.notifier);
      await controller.chooseCity('Cebu City');

      await controller.useCurrentLocation();

      expect(harness.container.read(locationProvider).cityContext, 'Davao City');
      expect(await store.read(kPreferredCityKey), isNull);
    });

    test('choosing anywhere clears the place and the saved city', () async {
      final store = MemoryPreferencesStore();
      final harness = _Harness((_) => null, store: store);
      addTearDown(harness.dispose);
      final controller = harness.container.read(locationProvider.notifier);
      await controller.chooseCity('Iloilo City');
      expect(harness.container.read(locationProvider).place.label, 'Iloilo City');

      await controller.chooseAnywhere();
      expect(harness.container.read(locationProvider).place, isA<AnywherePlace>());
      expect(await store.read(kPreferredCityKey), isNull);
    });

    for (final access in [
      LocationAccess.denied,
      LocationAccess.deniedForever,
      LocationAccess.serviceOff,
      LocationAccess.unavailable,
    ]) {
      test('$access keeps the current place and explains what to do', () async {
        final gateway = FakeLocationGateway(LocationOutcome(access), permitted: false);
        final harness = _Harness((_) => null, gateway: gateway);
        addTearDown(harness.dispose);
        final controller = harness.container.read(locationProvider.notifier);
        await controller.chooseCity('Cebu City');

        await controller.useCurrentLocation();
        final state = harness.container.read(locationProvider);
        expect(state.place, const AreaPlace('Cebu City'));
        expect(state.problemMessage, isNotNull);
        expect(state.canOpenSettings, access == LocationAccess.deniedForever || access == LocationAccess.serviceOff);
        if (state.canOpenSettings) {
          await controller.openSettings();
          expect(gateway.openedFor, access);
        }
      });
    }
  });
}
