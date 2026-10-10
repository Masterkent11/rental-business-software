import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/explore/domain/explore_query.dart';
import '../features/location/location_controller.dart';
import '../features/saved/saved_controller.dart';
import '../fixtures/view_models.dart';
import 'api_client.dart';
import 'auth_repository.dart';
import 'listing_query.dart';
import 'offline_cache.dart';

class ListingPage {
  const ListingPage({required this.items, required this.total, required this.hasMore});

  final List<ListingCardView> items;
  final int total;
  final bool hasMore;
}

class StayQuoteLine {
  const StayQuoteLine({required this.label, required this.centavos});

  final String label;
  final int centavos;
}

class StayQuote {
  const StayQuote({
    required this.nights,
    required this.guests,
    required this.nightlyCentavos,
    required this.lines,
    required this.totalCentavos,
    required this.available,
  });

  final int nights;
  final int guests;
  final int nightlyCentavos;
  final List<StayQuoteLine> lines;
  final int totalCentavos;
  final bool available;

  static StayQuote fromJson(Map<String, dynamic> json) => StayQuote(
        nights: (json['nights'] as num).toInt(),
        guests: (json['guests'] as num?)?.toInt() ?? 1,
        nightlyCentavos: (json['nightlyCentavos'] as num).toInt(),
        lines: (json['lines'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(
              (line) => StayQuoteLine(
                label: line['label'] as String? ?? '',
                centavos: (line['centavos'] as num).toInt(),
              ),
            )
            .toList(growable: false),
        totalCentavos: (json['totalCentavos'] as num).toInt(),
        available: json['available'] as bool? ?? true,
      );
}

class ListingRepository {
  ListingRepository(this._api, {OfflineCache? cache, this.cacheScope = 'guest'}) : _cache = cache;

  final ApiClient _api;
  final OfflineCache? _cache;
  final String cacheScope;

  Stream<ListingPage> watchSearch(
    ExploreQuery query, {
    SearchPlace place = const AnywherePlace(),
    int limit = kListingPageSize,
  }) {
    final parameters = listingSearchParameters(query, place: place, limit: limit);
    final cache = _cache;
    if (cache == null) return Stream.fromFuture(search(query, place: place, limit: limit));
    return cacheThenNetwork(
      cache: cache,
      key: cacheKey(cacheScope, '/listings', parameters),
      fetch: () => _api.getJson('/listings', query: parameters),
      decode: (body) => _page(body, 0),
      persist: isPersistable(parameters),
    );
  }

  Stream<ListingDetailView?> watchDetail(String id) {
    final cache = _cache;
    if (cache == null) return Stream.fromFuture(detail(id));
    return cacheThenNetwork<ListingDetailView?>(
      cache: cache,
      key: cacheKey(cacheScope, '/listings/$id', const {}),
      fetch: () => _api.getJson('/listings/$id'),
      decode: _detail,
    ).transform(
      StreamTransformer<ListingDetailView?, ListingDetailView?>.fromHandlers(
        handleError: (error, stackTrace, sink) =>
            error is ApiException && error.isNotFound ? sink.add(null) : sink.addError(error, stackTrace),
      ),
    );
  }

  Future<ListingPage> search(
    ExploreQuery query, {
    SearchPlace place = const AnywherePlace(),
    int offset = 0,
    int limit = kListingPageSize,
  }) async {
    final body = await _api.getJson(
      '/listings',
      query: listingSearchParameters(query, place: place, offset: offset, limit: limit),
    );
    return _page(body, offset);
  }

  Future<List<ListingCardView>> byIds(Iterable<String> ids) async {
    final wanted = ids.toList(growable: false);
    if (wanted.isEmpty) return const [];

    final body = await _api.getJson(
      '/listings',
      query: {'ids': wanted.take(50).join(','), 'limit': '50'},
    );
    return _items(body);
  }

  Future<ListingDetailView?> detail(String id) async {
    try {
      return _detail(await _api.getJson('/listings/$id'));
    } on ApiException catch (error) {
      if (error.isNotFound) return null;
      rethrow;
    }
  }

  static ListingDetailView _detail(Map<String, dynamic> body) {
    final card = toCard(body);
    return ListingDetailView(
      card: card,
      description: body['description'] as String? ?? '',
      amenities: _strings(body['amenities']),
      terms: _strings(body['terms']),
      houseRules: _strings(body['houseRules']),
      sharedFacilities: _strings(body['sharedFacilities']),
      minimumStayNights: (body['minStayNights'] as num?)?.toInt(),
      ownerName: body['ownerName'] as String? ?? '',
      ownerVerified: body['ownerVerified'] as bool? ?? false,
      scenes: const [],
      blockedRanges: const [],
      floorPlans: (body['floorPlans'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .where((plan) => (plan['url'] as String? ?? '').startsWith('http'))
          .map(
            (plan) => FloorPlanView(
              id: plan['id'] as String? ?? '',
              url: plan['url'] as String,
              label: plan['label'] as String? ?? 'Floor plan',
            ),
          )
          .toList(growable: false),
    );
  }

  Future<StayQuote> quote({
    required String listingId,
    required DateTime checkIn,
    required DateTime checkOut,
    required int guests,
  }) async {
    final body = await _api.getJson(
      '/listings/$listingId/quote',
      query: {
        'checkIn': isoDay(checkIn),
        'checkOut': isoDay(checkOut),
        'guests': '$guests',
      },
    );
    return StayQuote.fromJson(body);
  }

  static ListingPage _page(Map<String, dynamic> body, int offset) {
    final items = _items(body);
    final total = (body['total'] as num?)?.toInt() ?? items.length;
    return ListingPage(
      items: items,
      total: total,
      hasMore: body['hasMore'] as bool? ?? offset + items.length < total,
    );
  }

  static List<ListingCardView> _items(Map<String, dynamic> body) => (body['items'] as List<dynamic>? ?? const [])
      .whereType<Map<String, dynamic>>()
      .map(toCard)
      .toList(growable: false);

  static MoveInCostView? _moveInCost(Object? raw) {
    if (raw is! Map<String, dynamic>) return null;
    final lines = (raw['lines'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(
          (line) => (
            label: line['label'] as String? ?? '',
            centavos: (line['centavos'] as num).toInt(),
          ),
        )
        .toList(growable: false);

    return MoveInCostView(
      lines: lines,
      totalCentavos: (raw['totalCentavos'] as num).toInt(),
    );
  }

  static List<String> _strings(Object? raw) => (raw as List<dynamic>? ?? const []).whereType<String>().toList(
        growable: false,
      );

  static ListingCardView toCard(Map<String, dynamic> json) {
    return ListingCardView(
      id: json['id'] as String,
      resourceId: json['resourceId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      propertyName: json['propertyName'] as String? ?? '',
      areaLabel: json['areaLabel'] as String? ?? '',
      cityLabel: json['cityLabel'] as String? ?? '',
      kind: json['kind'] == 'SHORT_TERM' ? ListingKind.shortTerm : ListingKind.longTerm,
      resourceType: switch (json['resourceType']) {
        'ROOM' => ResourceType.room,
        'BED_SPACE' => ResourceType.bedSpace,
        'PARKING' => ResourceType.parking,
        'STORAGE' => ResourceType.storage,
        _ => ResourceType.unit,
      },
      priceCentavos: json['intent'] == 'SALE' ? null : (json['priceCentavos'] as num?)?.toInt(),
      availabilityLabel: json['availabilityLabel'] as String? ?? '',
      isAvailable: json['isAvailable'] as bool? ?? true,
      hasTour: json['hasTour'] as bool? ?? false,
      sceneCount: (json['sceneCount'] as num?)?.toInt() ?? 0,
      photos: (json['photos'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .where((url) => url.startsWith('http'))
          .toList(growable: false),
      moveInCost: _moveInCost(json['moveInCost']),
      isVerified: json['ownerVerified'] as bool? ?? false,
      beds: (json['bedrooms'] as num?)?.toInt() ?? 0,
      baths: (json['bathrooms'] as num?)?.toInt() ?? 0,
      sqm: (json['floorAreaSqm'] as num?)?.toInt(),
      maxGuests: (json['maxOccupants'] as num?)?.toInt() ?? 1,
      cleaningFeeCentavos: (json['cleaningFeeCentavos'] as num?)?.toInt() ?? 0,
      propertyType: json['propertyType'] as String?,
      minStayNights: (json['minStayNights'] as num?)?.toInt(),
      isPopular: json['hasTour'] as bool? ?? false,
      intent: json['intent'] == 'SALE' ? ListingIntent.sale : ListingIntent.rent,
      saleStatus: json['saleStatus'] as String?,
      lotAreaSqm: (json['lotAreaSqm'] as num?)?.toInt(),
      parkingSlots: (json['parkingSlots'] as num?)?.toInt() ?? 0,
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      location: _point(json['location']),
      tourProvider: json['tourProvider'] as String?,
      furnishing: json['furnishing'] as String?,
      petsAllowed: json['intent'] == 'SALE' ? null : json['petsAllowed'] as bool?,
    );
  }

  static MapPoint? _point(Object? raw) {
    if (raw is! Map<String, dynamic>) return null;
    final latitude = (raw['latitude'] as num?)?.toDouble();
    final longitude = (raw['longitude'] as num?)?.toDouble();
    if (latitude == null || longitude == null) return null;
    return MapPoint(
      latitude: latitude,
      longitude: longitude,
      precision: raw['precision'] == 'EXACT' ? LocationPrecision.exact : LocationPrecision.approximate,
    );
  }

}

final savedListingsProvider = FutureProvider<List<ListingCardView>>((ref) async {
  final ids = ref.watch(savedIdsProvider).valueOrNull ?? const <String>{};
  if (ids.isEmpty) return const [];
  return ref.watch(listingRepositoryProvider).byIds(ids);
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient(
    tokenSource: () => ref.read(authRepositoryProvider).accessToken,
  );
  ref.onDispose(client.close);
  return client;
});

final listingRepositoryProvider = Provider<ListingRepository>(
  (ref) => ListingRepository(
    ref.watch(apiClientProvider),
    cache: ref.watch(offlineCacheProvider),
    cacheScope: ref.watch(currentUserIdProvider) ?? 'guest',
  ),
);

final listingDetailProvider = StreamProvider.autoDispose.family<ListingDetailView?, String>((ref, id) {
  return ref.watch(listingRepositoryProvider).watchDetail(id);
});

typedef QuoteRequest = ({String listingId, DateTime checkIn, DateTime checkOut, int guests});

final stayQuoteProvider = FutureProvider.autoDispose.family<StayQuote, QuoteRequest>((ref, request) {
  return ref.watch(listingRepositoryProvider).quote(
        listingId: request.listingId,
        checkIn: request.checkIn,
        checkOut: request.checkOut,
        guests: request.guests,
      );
});
