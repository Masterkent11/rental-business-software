import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/explore/domain/listing_category.dart';
import '../features/location/location_controller.dart';
import '../fixtures/view_models.dart';
import 'api_client.dart';
import 'auth_repository.dart';
import 'listing_query.dart';
import 'listing_repository.dart';
import 'offline_cache.dart';

enum RecommendationScope { city, nearby, broad }

@immutable
class Recommendations {
  const Recommendations({required this.scope, required this.items});

  final RecommendationScope scope;
  final List<ListingCardView> items;
}

@immutable
class PopularAreaView {
  const PopularAreaView({
    required this.areaLabel,
    required this.cityLabel,
    required this.listingCount,
    required this.coverPhotoUrl,
  });

  final String areaLabel;
  final String cityLabel;
  final int listingCount;
  final String? coverPhotoUrl;

  String get displayName => areaLabel.replaceFirst(RegExp(r'^Brgy\.\s*', caseSensitive: false), '');
}

@immutable
class LocationSuggestionView {
  const LocationSuggestionView({required this.cityLabel, required this.areaLabel, required this.listingCount});

  final String cityLabel;
  final String? areaLabel;
  final int listingCount;

  String get label => areaLabel == null ? cityLabel : '$areaLabel, $cityLabel';
}

@immutable
class ListingSuggestionView {
  const ListingSuggestionView({required this.id, required this.title, required this.place, required this.intent});

  final String id;
  final String title;
  final String place;
  final MarketIntent intent;
}

@immutable
class SearchSuggestions {
  const SearchSuggestions({required this.locations, required this.listings, required this.categories});

  static const empty = SearchSuggestions(locations: [], listings: [], categories: []);

  final List<LocationSuggestionView> locations;
  final List<ListingSuggestionView> listings;
  final List<ListingCategory> categories;

  bool get isEmpty => locations.isEmpty && listings.isEmpty && categories.isEmpty;
}

class DiscoveryRepository {
  DiscoveryRepository(this._api, {OfflineCache? cache, this.cacheScope = 'guest'}) : _cache = cache;

  final ApiClient _api;
  final OfflineCache? _cache;
  final String cacheScope;

  Stream<T> _watch<T>(String path, Map<String, String?> query, T Function(Map<String, dynamic> body) decode) {
    final cache = _cache;
    if (cache == null) return Stream.fromFuture(_api.getJson(path, query: query).then(decode));
    return cacheThenNetwork(
      cache: cache,
      key: cacheKey(cacheScope, path, query),
      fetch: () => _api.getJson(path, query: query),
      decode: decode,
      persist: isPersistable(query),
    );
  }

  Stream<Recommendations> watchRecommendations({
    required MarketIntent intent,
    required SearchPlace place,
    ListingCategory? category,
    int limit = 10,
  }) =>
      _watch(
        '/discovery/recommendations',
        recommendationParameters(intent: intent, place: place, category: category, limit: limit),
        _recommendations,
      );

  Future<Recommendations> recommendations({
    required MarketIntent intent,
    required SearchPlace place,
    ListingCategory? category,
    int limit = 10,
  }) async =>
      _recommendations(
        await _api.getJson(
          '/discovery/recommendations',
          query: recommendationParameters(intent: intent, place: place, category: category, limit: limit),
        ),
      );

  Stream<List<PopularAreaView>> watchPopularAreas({required MarketIntent intent, String? city, int limit = 8}) =>
      _watch('/discovery/popular-areas', {'intent': intent.apiValue, 'city': city, 'limit': '$limit'}, _areas);

  static Recommendations _recommendations(Map<String, dynamic> body) => Recommendations(
        scope: switch (body['scope']) {
          'CITY' => RecommendationScope.city,
          'NEARBY' => RecommendationScope.nearby,
          _ => RecommendationScope.broad,
        },
        items: (body['items'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(ListingRepository.toCard)
            .toList(growable: false),
      );

  static List<PopularAreaView> _areas(Map<String, dynamic> body) => (body['items'] as List<dynamic>? ?? const [])
      .whereType<Map<String, dynamic>>()
      .map(
        (area) => PopularAreaView(
          areaLabel: area['areaLabel'] as String? ?? '',
          cityLabel: area['cityLabel'] as String? ?? '',
          listingCount: (area['listingCount'] as num?)?.toInt() ?? 0,
          coverPhotoUrl: _httpUrl(area['coverPhotoUrl']),
        ),
      )
      .where((area) => area.areaLabel.isNotEmpty)
      .toList(growable: false);

  Future<SearchSuggestions> suggestions(String text, {MarketIntent? intent}) async {
    final body = await _api.getJson('/discovery/suggestions', query: {'q': text, 'intent': intent?.apiValue});
    return SearchSuggestions(
      locations: (body['locations'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(
            (l) => LocationSuggestionView(
              cityLabel: l['cityLabel'] as String? ?? '',
              areaLabel: l['areaLabel'] as String?,
              listingCount: (l['listingCount'] as num?)?.toInt() ?? 0,
            ),
          )
          .toList(growable: false),
      listings: (body['listings'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(
            (l) => ListingSuggestionView(
              id: l['id'] as String,
              title: l['title'] as String? ?? '',
              place: [l['areaLabel'], l['cityLabel']].whereType<String>().where((p) => p.isNotEmpty).join(', '),
              intent: l['intent'] == 'SALE' ? MarketIntent.buy : MarketIntent.rent,
            ),
          )
          .toList(growable: false),
      categories: (body['categories'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map((c) => ListingCategory.tryParse(c['propertyType'] as String?))
          .whereType<ListingCategory>()
          .toList(growable: false),
    );
  }

  Future<String?> resolveCity(DevicePosition position) async {
    final body = await _api.getJson(
      '/discovery/resolve-location',
      query: {'lat': position.latitude.toStringAsFixed(3), 'lng': position.longitude.toStringAsFixed(3)},
    );
    final place = body['place'];
    return place is Map<String, dynamic> ? place['cityLabel'] as String? : null;
  }

  Future<void> recordView(String listingId) =>
      _api.sendJson('POST', '/me/listing-views', body: {'listingId': listingId});
}

String? _httpUrl(Object? raw) => raw is String && raw.startsWith('http') ? raw : null;

final discoveryRepositoryProvider = Provider<DiscoveryRepository>(
  (ref) => DiscoveryRepository(
    ref.watch(apiClientProvider),
    cache: ref.watch(offlineCacheProvider),
    cacheScope: ref.watch(currentUserIdProvider) ?? 'guest',
  ),
);
