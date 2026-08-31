import '../../../../core/networking/api.client.dart';
import '../../ports/repositories/saved_repository.port.dart';

class SavedRepositoryAdapter implements SavedRepository {
  SavedRepositoryAdapter(this._api);

  final ApiClient _api;

  @override
  Future<List<String>> savedIds() async {
    final body = await _api.getJson('/me/saved-listings');
    final raw = (body['listingIds'] as List<dynamic>? ?? const []);
    return raw.whereType<String>().toList(growable: false);
  }

  @override
  Future<List<String>> savedListingIds() => savedIds();

  @override
  Future<List<String>> getSavedListingIds() => savedIds();

  @override
  Future<List<String>> save(String id) async {
    final body = await _api.postJson('/me/saved-listings', {'listingId': id});
    final raw = (body['listingIds'] as List<dynamic>? ?? const []);
    return raw.whereType<String>().toList(growable: false);
  }

  @override
  Future<List<String>> saveListing(String id) => save(id);

  @override
  Future<List<String>> unsave(String id) async {
    final body = await _api.deleteJson('/me/saved-listings/$id');
    final raw = (body['listingIds'] as List<dynamic>? ?? const []);
    return raw.whereType<String>().toList(growable: false);
  }

  @override
  Future<List<String>> unsaveListing(String id) => unsave(id);
}

typedef SavedRepositoryImpl = SavedRepositoryAdapter;
