import '../../../../core/networking/api.client.dart';
import '../../domain/entities/account_profile.entity.dart';
import '../../ports/repositories/account_repository.port.dart';
import '../dto/account_profile.dto.dart';
import '../mappers/account_profile.mapper.dart';

class AccountRepositoryAdapter implements AccountRepository {
  AccountRepositoryAdapter(this._apiClient);
  final ApiClient _apiClient;

  @override
  Future<AccountProfile?> getProfile() async {
    final json = await _apiClient.getJson('/me');
    return AccountProfileDto.fromJson(json).toDomain();
  }

  @override
  Future<List<String>> savedListingIds() async {
    final json = await _apiClient.getJson('/me/saved');
    return (json['listingIds'] as List<dynamic>? ?? const [])
        .whereType<String>()
        .toList(growable: false);
  }

  @override
  Future<List<String>> save(String listingId) async {
    final json = await _apiClient.postJson('/me/saved/$listingId');
    return (json['listingIds'] as List<dynamic>? ?? const [])
        .whereType<String>()
        .toList(growable: false);
  }

  @override
  Future<List<String>> unsave(String listingId) async {
    final json = await _apiClient.deleteJson('/me/saved/$listingId');
    return (json['listingIds'] as List<dynamic>? ?? const [])
        .whereType<String>()
        .toList(growable: false);
  }
}

typedef AccountRepositoryImpl = AccountRepositoryAdapter;
