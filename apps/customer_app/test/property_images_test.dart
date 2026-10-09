import 'dart:convert';

import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/discovery_repository.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/data/offline_cache.dart';
import 'package:customer_app/data/preferences_store.dart';
import 'package:customer_app/design/app_image.dart';
import 'package:customer_app/features/explore/domain/listing_category.dart';
import 'package:customer_app/features/location/location_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  const baseItem = {
    'id': 'd3000000-0000-4000-8000-000000000001',
    'title': 'Skyline studio',
    'areaLabel': 'Brgy. Apas',
    'cityLabel': 'Cebu City',
    'kind': 'SHORT_TERM',
    'resourceType': 'UNIT',
    'priceCentavos': 280000,
  };

  group('Listing and Recommendation photo decoding', () {
    test('preserves single photo URL', () {
      final card = ListingRepository.toCard({
        ...baseItem,
        'photos': ['https://example.com/demo-1.jpg'],
      });
      expect(card.photos, ['https://example.com/demo-1.jpg']);
    });

    test('preserves multiple valid photo URLs intact', () {
      final card = ListingRepository.toCard({
        ...baseItem,
        'photos': [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'http://example.com/3.jpg',
        ],
      });
      expect(card.photos, [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'http://example.com/3.jpg',
      ]);
    });

    test('empty or missing photos safely become an empty list', () {
      final withEmpty = ListingRepository.toCard({
        ...baseItem,
        'photos': <dynamic>[],
      });
      final withMissing = ListingRepository.toCard({
        ...baseItem,
      });
      final withNull = ListingRepository.toCard({
        ...baseItem,
        'photos': null,
      });
      expect(withEmpty.photos, isEmpty);
      expect(withMissing.photos, isEmpty);
      expect(withNull.photos, isEmpty);
    });

    test('invalid and non-http image values do not crash and are filtered out', () {
      final card = ListingRepository.toCard({
        ...baseItem,
        'photos': [
          'data:image/jpeg;base64,12345',
          123,
          null,
          'ftp://example.com/image.jpg',
          'invalid-url',
          'https://example.com/valid.jpg',
        ],
      });
      expect(card.photos, ['https://example.com/valid.jpg']);
    });

    test('recommendations endpoint preserves photo URLs end-to-end', () async {
      final client = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'scope': 'BROAD',
            'items': [
              {
                ...baseItem,
                'photos': ['https://example.com/rec.jpg'],
              },
            ],
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });
      final repo = DiscoveryRepository(ApiClient(client: client, baseUrl: 'http://test'));
      final result = await repo.recommendations(
        intent: MarketIntent.rent,
        place: const AnywherePlace(),
      );
      expect(result.items.length, 1);
      expect(result.items.first.photos, ['https://example.com/rec.jpg']);
    });
  });

  group('Offline cache reconciliation and invalidation', () {
    test('cache-then-network emits fresh response after cached response', () async {
      final store = MemoryPreferencesStore();
      final cache = OfflineCache(store);
      const key = 'test-key';
      await cache.write(key, {
        'scope': 'BROAD',
        'items': [
          {...baseItem, 'photos': <dynamic>[]},
        ],
      });

      final emissions = await cacheThenNetwork<List<String>>(
        cache: cache,
        key: key,
        fetch: () async => {
          'scope': 'BROAD',
          'items': [
            {
              ...baseItem,
              'photos': ['https://example.com/fresh.jpg'],
            },
          ],
        },
        decode: (body) {
          final items = body['items'] as List<dynamic>;
          final item = items.first as Map<String, dynamic>;
          final photos = item['photos'] as List<dynamic>;
          return photos.cast<String>();
        },
        retryDelays: const [Duration(milliseconds: 10)],
      ).toList();

      expect(emissions.length, 2);
      expect(emissions[0], isEmpty);
      expect(emissions[1], ['https://example.com/fresh.jpg']);

      final cachedAfter = await cache.read(key);
      expect(cachedAfter, isNotNull);
      final items = cachedAfter!['items'] as List<dynamic>;
      final firstItem = items.first as Map<String, dynamic>;
      expect(firstItem['photos'], ['https://example.com/fresh.jpg']);
    });

    test('stale cache with mismatched version is invalidated', () async {
      final store = MemoryPreferencesStore();
      final cache = OfflineCache(store);
      await store.write(
        'offline_cache.entry.stale-key',
        jsonEncode({
          'v': 0,
          'savedAt': DateTime.now().millisecondsSinceEpoch,
          'body': {'scope': 'BROAD', 'items': <dynamic>[]},
        }),
      );
      final read = await cache.read('stale-key');
      expect(read, isNull);
    });
  });

  group('AppImage widget behavior', () {
    testWidgets('renders fallback without NetworkImage for an invalid or empty URL', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AppImage(
              url: '',
              fallbackIcon: Icons.home_outlined,
            ),
          ),
        ),
      );
      expect(find.byIcon(Icons.home_outlined), findsOneWidget);
      expect(find.byType(Image), findsNothing);

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AppImage(
              url: 'not-a-valid-http-url',
              fallbackIcon: Icons.home_outlined,
            ),
          ),
        ),
      );
      expect(find.byIcon(Icons.home_outlined), findsOneWidget);
      expect(find.byType(Image), findsNothing);
    });

    testWidgets('accepts a valid URL without treating it as empty', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AppImage(
              url: 'https://example.com/property.jpg',
              fallbackIcon: Icons.home_outlined,
            ),
          ),
        ),
      );
      expect(find.byType(Image), findsOneWidget);
      final image = tester.widget<Image>(find.byType(Image));
      expect(image.image, isA<NetworkImage>());
      final networkImage = image.image as NetworkImage;
      expect(networkImage.url, 'https://example.com/property.jpg');
    });
  });
}
