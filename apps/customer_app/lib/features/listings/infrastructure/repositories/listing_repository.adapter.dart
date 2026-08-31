import '../../../../core/networking/api.client.dart';
import '../../../../core/networking/api.exception.dart';
import '../../../discovery/presentation/controllers/discovery.controller.dart' show DiscoveryFilters;
import '../../domain/entities/listing.entity.dart';
import '../../domain/entities/listing_detail.entity.dart';
import '../../domain/value_objects/listing_search_filters.value_object.dart';
import '../../ports/repositories/listing_repository.port.dart';
import '../dto/listing.dto.dart';
import '../mappers/listing.mapper.dart';

class ListingRepositoryAdapter implements ListingRepository {
  ListingRepositoryAdapter(this._api);

  final ApiClient _api;

  @override
  Future<List<Listing>> search([dynamic criteria]) async {
    ListingSearchFilters filters;
    if (criteria is ListingSearchFilters) {
      filters = criteria;
    } else if (criteria is DiscoveryFilters) {
      filters = criteria.toSearchFilters();
    } else {
      filters = const ListingSearchFilters();
    }

    final res = await _api.get('/listings', queryParameters: {
      'q': filters.query.trim().isEmpty ? null : filters.query.trim(),
      'kind': _kind(filters.kind),
      'type': _type(filters.resourceType),
      'maxPrice': filters.maxPriceCentavos?.toString(),
      'hasTour': filters.hasTour == true ? 'true' : null,
      'limit': '50',
    });

    List<dynamic> items;
    if (res is List) {
      items = res;
    } else if (res is Map && res['items'] is List) {
      items = res['items'] as List;
    } else if (res is Map && res['data'] is List) {
      items = res['data'] as List;
    } else {
      items = const [];
    }

    return items
        .whereType<Map>()
        .map((json) => ListingMapper.fromDto(ListingDto.fromJson(Map<String, dynamic>.from(json))))
        .toList(growable: false);
  }

  @override
  Future<List<Listing>> all() => search();

  @override
  Future<List<Listing>> getListingsByIds(Iterable<String> ids) async {
    final wanted = ids.toList(growable: false);
    if (wanted.isEmpty) return const [];

    final res = await _api.get('/listings', queryParameters: {
      'ids': wanted.join(','),
      'limit': '50',
    });

    List<dynamic> items;
    if (res is List) {
      items = res;
    } else if (res is Map && res['items'] is List) {
      items = res['items'] as List;
    } else if (res is Map && res['data'] is List) {
      items = res['data'] as List;
    } else {
      items = const [];
    }

    return items
        .whereType<Map>()
        .map((json) => ListingMapper.fromDto(ListingDto.fromJson(Map<String, dynamic>.from(json))))
        .toList(growable: false);
  }

  @override
  Future<List<Listing>> byIds(Iterable<String> ids) => getListingsByIds(ids);

  @override
  Future<ListingDetail?> getDetail(String id) async {
    try {
      final body = await _api.getJson('/listings/$id');
      final card = ListingMapper.fromDto(ListingDto.fromJson(Map<String, dynamic>.from(body)));

      return ListingDetail(
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
  Future<ListingDetail?> detail(String id) => getDetail(id);

  static List<String> _strings(Object? raw) =>
      (raw as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(growable: false);

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
}

typedef ListingRepositoryImpl = ListingRepositoryAdapter;
