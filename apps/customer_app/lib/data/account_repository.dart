import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'auth_repository.dart';
import 'listing_repository.dart';

typedef HeldCapability = ({String capability, String? organizationId});

class AccountView {
  const AccountView({
    required this.id,
    required this.displayName,
    required this.capabilities,
    this.email,
  });

  final String id;
  final String displayName;
  final String? email;
  final List<HeldCapability> capabilities;

  bool get isTenant => capabilities.any((c) => c.capability == 'TENANT');
  bool get isOwner => capabilities.any((c) => c.capability == 'OWNER');
}

class AccountRepository {
  AccountRepository(this._api);

  final ApiClient _api;

  Future<AccountView> me() async {
    final json = await _api.getJson('/me');

    return _account(json);
  }

  Future<AccountView> updateName(String displayName) async {
    return _account(await _api.sendJson('PATCH', '/me', body: {'displayName': displayName}));
  }

  static AccountView _account(Map<String, dynamic> json) {
    return AccountView(
      id: json['id'] as String,
      displayName: json['displayName'] as String? ?? '',
      email: json['email'] as String?,
      capabilities: (json['capabilities'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(
            (c) => (
              capability: c['capability'] as String? ?? '',
              organizationId: c['organizationId'] as String?,
            ),
          )
          .toList(growable: false),
    );
  }

  Future<List<String>> savedListingIds() async {
    final json = await _api.getJson('/me/saved-listings');
    return _ids(json);
  }

  Future<List<String>> save(String listingId) async {
    final json = await _api.sendJson(
      'POST',
      '/me/saved-listings',
      body: {'listingId': listingId},
    );
    return _ids(json);
  }

  Future<List<String>> unsave(String listingId) async {
    final json = await _api.sendJson('DELETE', '/me/saved-listings/$listingId');
    return _ids(json);
  }

  static List<String> _ids(Map<String, dynamic> json) =>
      (json['listingIds'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(growable: false);
}

final accountRepositoryProvider = Provider<AccountRepository>(
  (ref) => AccountRepository(ref.watch(apiClientProvider)),
);

final accountProvider = FutureProvider<AccountView?>((ref) async {
  ref.watch(sessionProvider);
  if (ref.watch(authRepositoryProvider).accessToken == null) return null;

  try {
    return await ref.watch(accountRepositoryProvider).me();
  } on ApiException catch (error) {
    if (error.isUnauthorized) return null;
    rethrow;
  }
});
