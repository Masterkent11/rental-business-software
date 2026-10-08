import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/discovery/discovery_controller.dart';
import '../features/location/location_controller.dart';
import '../features/property_search/application/property_search_repository.dart';
import '../features/property_search/domain/property_search_criteria.dart';
import '../features/property_search/domain/property_type.dart';
import '../features/saved/saved_controller.dart';
import '../fixtures/view_models.dart';
import 'api_client.dart';
import 'auth_repository.dart';

const int kListingPageSize = 20;

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

String isoDay(DateTime day) =>
    '${day.year.toString().padLeft(4, '0')}-'
    '${day.month.toString().padLeft(2, '0')}-'
    '${day.day.toString().padLeft(2, '0')}';

class ListingRepository implements PropertySearchRepository {
  ListingRepository(this._api);

  final ApiClient _api;

  Future<ListingPage> search(
    DiscoveryFilters filters, {
    SearchPlace place = const AnywherePlace(),
    int offset = 0,
    int limit = kListingPageSize,
  }) async {
    final body = await _api.getJson('/listings', query: searchQuery(filters, place: place, offset: offset, limit: limit));
    return _page(body, offset);
  }

  static Map<String, String?> searchQuery(
    DiscoveryFilters filters, {
    SearchPlace place = const AnywherePlace(),
    int offset = 0,
    int limit = kListingPageSize,
  }) {
    final buy = filters.isBuy;
    final query = <String, String?>{
      'q': filters.query.trim().isEmpty ? null : filters.query.trim(),
      'intent': buy ? 'SALE' : 'RENT',
      'hasTour': filters.tourOnly ? 'true' : null,
      'limit': '$limit',
      'offset': '$offset',
    };
    if (buy) {
      query['propertyType'] = filters.buyCategory?.propertyType;
      query['saleStatus'] = filters.buyCategory?.saleStatus;
    } else {
      query['kind'] = _kind(filters.kind);
      query['type'] = _type(filters.type);
      query['maxPrice'] = filters.maxCentavos?.toString();
    }
    switch (place) {
      case NearMePlace(:final position):
        query['lat'] = position.latitude.toStringAsFixed(3);
        query['lng'] = position.longitude.toStringAsFixed(3);
        query['radiusKm'] = '25';
        query['sort'] = 'DISTANCE';
      case AreaPlace(:final area):
        query['city'] = area.cityLabel;
      case AnywherePlace():
        break;
    }
    return query;
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
      final body = await _api.getJson('/listings/$id');
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
    } on ApiException catch (error) {
      if (error.isNotFound) return null;
      rethrow;
    }
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

  @override
  Future<PropertySearchPage> searchProperties(
    PropertySearchCriteria criteria, {
    int offset = 0,
    PropertyRefinements refinements = const PropertyRefinements(),
  }) async {
    final keyword = refinements.keyword.trim();
    final queryText = keyword.isNotEmpty ? keyword : criteria.location.trim();
    final query = <String, String?>{
      'q': queryText.isEmpty ? null : queryText,
      'intent': 'RENT',
      'propertyType': _propertyType(criteria.propertyType),
      'sort': refinements.sort.apiValue,
      'maxPrice': refinements.maxPriceCentavos?.toString(),
      'bedrooms': refinements.minBedrooms?.toString(),
      'limit': '$kListingPageSize',
      'offset': '$offset',
    };
    switch (criteria) {
      case ShortStaySearchCriteria():
        query['kind'] = 'SHORT_TERM';
        query['guests'] = '${criteria.guests}';
        query['checkIn'] = isoDay(criteria.checkIn);
        query['checkOut'] = isoDay(criteria.checkOut);
      case MonthlySearchCriteria():
        query['kind'] = 'LONG_TERM';
        query['guests'] = '${criteria.occupants}';
        query['moveIn'] = isoDay(criteria.moveInDate);
    }
    final page = _page(await _api.getJson('/listings', query: query), offset);
    return PropertySearchPage(items: page.items, total: page.total, hasMore: page.hasMore);
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

  static List<ListingCardView> _items(Map<String, dynamic> body) =>
      (body['items'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(toCard)
          .toList(growable: false);

  static String _propertyType(PropertyType type) => switch (type) {
        PropertyType.apartment => 'APARTMENT',
        PropertyType.condo => 'CONDO',
        PropertyType.house => 'HOUSE',
        PropertyType.room => 'ROOM',
        PropertyType.boardingHouse => 'BOARDING_HOUSE',
      };

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

  static List<String> _strings(Object? raw) =>
      (raw as List<dynamic>? ?? const []).whereType<String>().toList(
            growable: false,
          );

  static String? _kind(ListingKind? kind) => switch (kind) {
        ListingKind.longTerm => 'LONG_TERM',
        ListingKind.shortTerm => 'SHORT_TERM',
        null => null,
      };

  static String? _type(ResourceType? type) => switch (type) {
        ResourceType.unit => 'UNIT',
        ResourceType.room => 'ROOM',
        ResourceType.bedSpace => 'BED_SPACE',
        ResourceType.parking => 'PARKING',
        ResourceType.storage => 'STORAGE',
        null => null,
      };

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
      representative: _representative(json['representative']),
      tourProvider: json['tourProvider'] as String?,
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

  static RepresentativeView? _representative(Object? raw) {
    if (raw is! Map<String, dynamic>) return null;
    final agentId = raw['agentId'] as String?;
    if (agentId == null) return null;
    final photo = raw['photoUrl'] as String?;
    return RepresentativeView(
      agentId: agentId,
      displayName: raw['displayName'] as String? ?? 'Agent',
      headline: raw['headline'] as String? ?? '',
      photoUrl: photo != null && photo.startsWith('http') ? photo : null,
      verified: raw['verified'] as bool? ?? false,
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
  (ref) => ListingRepository(ref.watch(apiClientProvider)),
);

final listingDetailProvider =
    FutureProvider.autoDispose.family<ListingDetailView?, String>((ref, id) {
  return ref.watch(listingRepositoryProvider).detail(id);
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
