import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../fixtures/view_models.dart' show BookingStatus;
import 'api_client.dart';
import 'auth_repository.dart';
import 'listing_repository.dart';

typedef HeldCapability = ({String capability, String? organizationId});

class AccountView {
  const AccountView({
    required this.id,
    required this.displayName,
    required this.capabilities,
  });

  final String id;
  final String displayName;
  final List<HeldCapability> capabilities;

  bool get isTenant => capabilities.any((c) => c.capability == 'TENANT');
  bool get isOwner => capabilities.any((c) => c.capability == 'OWNER');
}

class StayReceiptView {
  const StayReceiptView({
    required this.id,
    required this.reference,
    required this.listingTitle,
    required this.propertyName,
    required this.areaLabel,
    required this.cityLabel,
    required this.startsOn,
    required this.endsOn,
    required this.nights,
    required this.paidCentavos,
    required this.paidAt,
    required this.state,
    required this.photo,
    required this.stateLabel,
    required this.bucket,
  });

  final String id;

  final String reference;

  final String listingTitle;
  final String propertyName;
  final String areaLabel;
  final String cityLabel;
  final DateTime startsOn;
  final DateTime endsOn;
  final int nights;

  final int paidCentavos;
  final DateTime? paidAt;
  final String state;
  final String? photo;

  final String stateLabel;

  final BookingStatus bucket;

  bool get isPaid => paidCentavos > 0 && paidAt != null;
}

class AccountRepository {
  AccountRepository(this._api);

  final ApiClient _api;

  Future<AccountView> me() async {
    final json = await _api.getJson('/me');

    return AccountView(
      id: json['id'] as String,
      displayName: json['displayName'] as String? ?? '',
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

  Future<List<StayReceiptView>> stays() async {
    final json = await _api.getJson('/me/stays');

    return (json['stays'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(
          (stay) => StayReceiptView(
            id: stay['id'] as String,
            reference: stay['reference'] as String? ?? '',
            listingTitle: stay['listingTitle'] as String? ?? '',
            propertyName: stay['propertyName'] as String? ?? '',
            areaLabel: stay['areaLabel'] as String? ?? '',
            cityLabel: stay['cityLabel'] as String? ?? '',
            startsOn: DateTime.parse(stay['startsOn'] as String),
            endsOn: DateTime.parse(stay['endsOn'] as String),
            nights: (stay['nights'] as num?)?.toInt() ?? 0,
            paidCentavos: (stay['paidCentavos'] as num?)?.toInt() ?? 0,
            paidAt: stay['paidAt'] == null
                ? null
                : DateTime.parse(stay['paidAt'] as String),
            state: stay['state'] as String? ?? '',
            photo: stay['photo'] as String?,
            stateLabel: stay['stateLabel'] as String? ?? '',
            bucket: switch (stay['bucket']) {
              'CANCELLED' => BookingStatus.cancelled,
              'PAST' => BookingStatus.past,
              _ => BookingStatus.active,
            },
          ),
        )
        .toList(growable: false);
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

final staysProvider = FutureProvider<List<StayReceiptView>>((ref) async {
  ref.watch(sessionProvider);
  if (ref.watch(authRepositoryProvider).accessToken == null) return const [];

  try {
    return await ref.watch(accountRepositoryProvider).stays();
  } on ApiException catch (error) {
    if (error.isUnauthorized) return const [];
    rethrow;
  }
});

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
