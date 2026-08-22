import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../fixtures/view_models.dart' show BookingStatus;
import 'api_client.dart';
import 'auth_repository.dart';
import 'listing_repository.dart';

/// One capability the signed-in person holds, and where it applies.
typedef HeldCapability = ({String capability, String? organizationId});

/// The signed-in person, as the **server** describes them.
///
/// Note what the app does not do: derive this from the token. Capabilities are
/// resolved server-side on every request (ADR-0007), so the client's job is to
/// render what it is told, not to work it out. A client that decided for itself
/// would be a second source of authority that drifts from the first.
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

/// A stay the customer paid for, with its receipt.
///
/// Every figure here comes from the server: what was paid is read from the
/// payment behind the booking, not recomputed from the listing's current price.
/// A receipt that disagrees with the ledger is worse than no receipt.
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

  /// Short and human-quotable. Nobody reads a uuid down a phone line.
  final String reference;

  final String listingTitle;
  final String propertyName;
  final String areaLabel;
  final String cityLabel;
  final DateTime startsOn;
  final DateTime endsOn;
  final int nights;

  /// Integer centavos, like every other amount.
  final int paidCentavos;
  final DateTime? paidAt;
  final String state;
  final String? photo;

  /// Server-decided copy — "Confirmed", "Checked in", "Completed". Rendered,
  /// never derived: three clients deriving it from dates is three chances to
  /// tell a customer something different about the same stay.
  final String stateLabel;

  /// Which tab this belongs under. Also the server's decision.
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
          .map((c) => (
                capability: c['capability'] as String? ?? '',
                organizationId: c['organizationId'] as String?,
              ))
          .toList(growable: false),
    );
  }

  Future<List<StayReceiptView>> stays() async {
    final json = await _api.getJson('/me/stays');

    return (json['stays'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map((stay) => StayReceiptView(
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
            ))
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

/// The customer's stays. Empty when signed out — there is nobody to ask about.
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

/// The signed-in person, or null when signed out.
///
/// Watches [sessionProvider] so signing in or out re-fetches rather than
/// serving a stale account.
final accountProvider = FutureProvider<AccountView?>((ref) async {
  ref.watch(sessionProvider);
  if (ref.watch(authRepositoryProvider).accessToken == null) return null;

  try {
    return await ref.watch(accountRepositoryProvider).me();
  } on ApiException catch (error) {
    // A token the server will not accept is the same situation as no token:
    // offer sign-in rather than an error the customer cannot act on.
    if (error.isUnauthorized) return null;
    rethrow;
  }
});
