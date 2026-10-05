import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/discovery/discovery_controller.dart';
import '../features/property_search/application/property_search_repository.dart';
import '../features/property_search/domain/property_search_criteria.dart';
import '../features/property_search/domain/property_type.dart';
import '../features/property_search/domain/rental_mode.dart';
import '../fixtures/sample_data.dart';
import '../fixtures/view_models.dart';
import 'api_client.dart';
import 'auth_repository.dart';
import '../features/saved/saved_controller.dart';

class ListingRepository implements PropertySearchRepository {
  ListingRepository(this._api);

  final ApiClient _api;

  Future<List<ListingCardView>> search(DiscoveryFilters filters) async {
    final body = await _api.getJson(
      '/listings',
      query: {
        'q': filters.query.trim().isEmpty ? null : filters.query.trim(),
        'kind': _kind(filters.kind),
        'type': _type(filters.type),
        'maxPrice': filters.maxCentavos?.toString(),
        'hasTour': filters.tourOnly ? 'true' : null,
        'limit': '50',
      },
    );

    final items = (body['items'] as List<dynamic>? ?? const []);
    return items
        .whereType<Map<String, dynamic>>()
        .map(_toCard)
        .toList(growable: false);
  }

  Future<List<ListingCardView>> byIds(Iterable<String> ids) async {
    final wanted = ids.toList(growable: false);
    if (wanted.isEmpty) return const [];

    final body = await _api.getJson(
      '/listings',
      query: {'ids': wanted.join(','), 'limit': '50'},
    );

    final items = (body['items'] as List<dynamic>? ?? const []);
    return items
        .whereType<Map<String, dynamic>>()
        .map(_toCard)
        .toList(growable: false);
  }

  Future<ListingDetailView?> detail(String id) async {
    try {
      final body = await _api.getJson('/listings/$id');
      final card = _toCard(body);
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
      );
    } on ApiException catch (error) {
      if (error.isNotFound) return null;
      rethrow;
    }
  }

  @override
  Future<List<ListingCardView>> searchProperties(
    PropertySearchCriteria criteria,
  ) async {
    final kindParam = criteria.rentalMode == RentalMode.shortStay
        ? 'SHORT_TERM'
        : 'LONG_TERM';
    final queryText = criteria.location.trim();

    try {
      final body = await _api.getJson(
        '/listings',
        query: {
          'q': queryText.isEmpty ? null : queryText,
          'kind': kindParam,
          'category': criteria.propertyType.name,
          'limit': '50',
        },
      );

      final items = (body['items'] as List<dynamic>? ?? const []);
      final cards = items
          .whereType<Map<String, dynamic>>()
          .map(_toCard)
          .toList(growable: false);

      if (cards.isNotEmpty) {
        return _filterCardsByCriteria(cards, criteria);
      }
      return _filterCardsByCriteria(SampleData.listings, criteria);
    } catch (_) {
      return _filterCardsByCriteria(SampleData.listings, criteria);
    }
  }

  static List<ListingCardView> _filterCardsByCriteria(
    List<ListingCardView> list,
    PropertySearchCriteria criteria,
  ) {
    final wantKind = criteria.rentalMode == RentalMode.shortStay
        ? ListingKind.shortTerm
        : ListingKind.longTerm;

    final byKind = list.where((l) => l.kind == wantKind).toList();

    bool matchesType(ListingCardView card) {
      final t = '${card.title} ${card.propertyName}'.toLowerCase();
      return switch (criteria.propertyType) {
        PropertyType.apartment =>
          t.contains('apartment') || t.contains('unit') || t.contains('flat'),
        PropertyType.condo => t.contains('condo') || t.contains('residences'),
        PropertyType.house =>
          t.contains('house') || t.contains('townhouse') || t.contains('villa'),
        PropertyType.room =>
          card.resourceType == ResourceType.room || t.contains('room'),
        PropertyType.boardingHouse =>
          card.resourceType == ResourceType.bedSpace ||
              t.contains('boarding') ||
              t.contains('bed space'),
      };
    }

    final byType = byKind.where(matchesType).toList();
    if (byType.isNotEmpty) {
      return byType;
    }
    return byKind.isNotEmpty ? byKind : list;
  }

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

  static ListingCardView _toCard(Map<String, dynamic> json) {
    return ListingCardView(
      id: json['id'] as String,
      resourceId: json['resourceId'] as String? ?? '',
      title: json['title'] as String? ?? '',
      propertyName: json['propertyName'] as String? ?? '',
      areaLabel: json['areaLabel'] as String? ?? '',
      cityLabel: json['cityLabel'] as String? ?? '',
      kind: json['kind'] == 'SHORT_TERM'
          ? ListingKind.shortTerm
          : ListingKind.longTerm,
      resourceType: switch (json['resourceType']) {
        'ROOM' => ResourceType.room,
        'BED_SPACE' => ResourceType.bedSpace,
        'PARKING' => ResourceType.parking,
        'STORAGE' => ResourceType.storage,
        _ => ResourceType.unit,
      },
      priceCentavos: (json['priceCentavos'] as num).toInt(),
      availabilityLabel: json['availabilityLabel'] as String? ?? '',
      isAvailable: json['isAvailable'] as bool? ?? true,
      hasTour: json['hasTour'] as bool? ?? false,
      sceneCount: (json['sceneCount'] as num?)?.toInt() ?? 0,
      photos: (json['photos'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(growable: false),
      moveInCost: _moveInCost(json['moveInCost']),
      rating: (json['rating'] as num?)?.toDouble() ?? 4.8,
      reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 120,
      isVerified:
          json['isVerified'] as bool? ??
          (json['ownerVerified'] as bool? ?? true),
      beds: (json['beds'] as num?)?.toInt() ?? 1,
      baths: (json['baths'] as num?)?.toInt() ?? 1,
      sqm: (json['sqm'] as num?)?.toInt() ?? 32,
      isPopular: json['isPopular'] as bool? ?? true,
    );
  }
}

final savedListingsProvider = FutureProvider<List<ListingCardView>>((
  ref,
) async {
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

final listingDetailProvider = FutureProvider.autoDispose
    .family<ListingDetailView?, String>((ref, id) {
      return ref.watch(listingRepositoryProvider).detail(id);
    });
