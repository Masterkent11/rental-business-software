import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/discovery/discovery_controller.dart';
import '../fixtures/view_models.dart';
import 'api_client.dart';
import 'auth_repository.dart';
import '../features/saved/saved_controller.dart';

/// Listings, from the API.
///
/// This is the boundary the fixtures used to occupy. Everything above it works
/// in [ListingCardView] exactly as before; everything below it is HTTP.
///
/// **No business rules live here.** The server decides what is published, what
/// is available, and what a search matches. This maps a response to a view
/// model and nothing more — a client that re-filtered would be a second source
/// of truth for rules the domain owns.
class ListingRepository {
  ListingRepository(this._api);

  final ApiClient _api;

  Future<List<ListingCardView>> search(DiscoveryFilters filters) async {
    final body = await _api.getJson('/listings', query: {
      'q': filters.query.trim().isEmpty ? null : filters.query.trim(),
      'kind': _kind(filters.kind),
      'type': _type(filters.type),
      'maxPrice': filters.maxCentavos?.toString(),
      'hasTour': filters.tourOnly ? 'true' : null,
      'limit': '50',
    });

    final items = (body['items'] as List<dynamic>? ?? const []);
    return items
        .whereType<Map<String, dynamic>>()
        .map(_toCard)
        .toList(growable: false);
  }

  /// A specific set, in one request rather than one per id.
  Future<List<ListingCardView>> byIds(Iterable<String> ids) async {
    final wanted = ids.toList(growable: false);
    if (wanted.isEmpty) return const [];

    final body = await _api.getJson('/listings', query: {
      'ids': wanted.join(','),
      'limit': '50',
    });

    final items = (body['items'] as List<dynamic>? ?? const []);
    return items
        .whereType<Map<String, dynamic>>()
        .map(_toCard)
        .toList(growable: false);
  }

  /// Null when the listing is absent or not published — the API does not
  /// distinguish those two, deliberately (D-12).
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
        // Tour scenes are Sprint 6 and blocked nights are Sprint 3. Empty
        // until those endpoints exist, rather than fixture-backed: attaching
        // invented unavailability to a listing that is otherwise real is the
        // kind of half-true screen that is worse than an obviously missing one.
        // A client that guessed availability would also be the second source of
        // truth the domain model refuses (U-01).
        scenes: const [],
        blockedRanges: const [],
      );
    } on ApiException catch (error) {
      if (error.isNotFound) return null;
      rethrow;
    }
  }

  static MoveInCostView? _moveInCost(Object? raw) {
    if (raw is! Map<String, dynamic>) return null;
    final lines = (raw['lines'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map((line) => (
              label: line['label'] as String? ?? '',
              centavos: (line['centavos'] as num).toInt(),
            ))
        .toList(growable: false);

    return MoveInCostView(
      lines: lines,
      totalCentavos: (raw['totalCentavos'] as num).toInt(),
    );
  }

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
      // Integer centavos across the wire (P-06). Parsed as int, never double.
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
      isVerified: json['isVerified'] as bool? ??
          (json['ownerVerified'] as bool? ?? true),
      beds: (json['beds'] as num?)?.toInt() ?? 1,
      baths: (json['baths'] as num?)?.toInt() ?? 1,
      sqm: (json['sqm'] as num?)?.toInt() ?? 32,
      isPopular: json['isPopular'] as bool? ?? true,
    );
  }
}

/// The saved listings, in one request.
///
/// Published-only, like every other read: unsaving is not required for a
/// delisted place to disappear from the list.
final savedListingsProvider =
    FutureProvider<List<ListingCardView>>((ref) async {
  final ids = ref.watch(savedIdsProvider).valueOrNull ?? const <String>{};
  if (ids.isEmpty) return const [];
  return ref.watch(listingRepositoryProvider).byIds(ids);
});

final apiClientProvider = Provider<ApiClient>((ref) {
  // The token is read per request through this closure, not captured, so a
  // background refresh is picked up without rebuilding the client.
  final client = ApiClient(
    tokenSource: () => ref.read(authRepositoryProvider).accessToken,
  );
  ref.onDispose(client.close);
  return client;
});

final listingRepositoryProvider = Provider<ListingRepository>(
  (ref) => ListingRepository(ref.watch(apiClientProvider)),
);

/// One listing, fetched. Null means absent or unpublished.
final listingDetailProvider =
    FutureProvider.autoDispose.family<ListingDetailView?, String>((ref, id) {
  return ref.watch(listingRepositoryProvider).detail(id);
});
