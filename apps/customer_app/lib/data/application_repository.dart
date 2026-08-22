import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../fixtures/view_models.dart';
import 'api_client.dart';
import 'auth_repository.dart';
import 'listing_repository.dart';

/// Applications, as the server describes them.
///
/// Every state and every figure here is read, not derived. In particular the
/// move-in cost and the reservation's outcome come from the API — the client
/// showing a different number from the ledger would be worse than showing none.
class ApplicationRepository {
  ApplicationRepository(this._api);

  final ApiClient _api;

  Future<List<ApplicationView>> mine() async {
    final json = await _api.getJson('/me/applications');

    return (json['applications'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(_toView)
        .toList(growable: false);
  }

  Future<ApplicationView?> byId(String id) async {
    try {
      return _toView(await _api.getJson('/me/applications/$id'));
    } on ApiException catch (error) {
      if (error.isNotFound) return null;
      rethrow;
    }
  }

  /// Submit. Places no hold — approval is what takes a place off the market.
  Future<String> submit({
    required String resourceId,
    required DateTime desiredMoveIn,
    required int desiredTermMonths,
    String message = '',
  }) async {
    final json = await _api.sendJson('POST', '/applications', body: {
      'resourceId': resourceId,
      'desiredMoveIn': _iso(desiredMoveIn),
      'desiredTermMonths': desiredTermMonths,
      'message': message,
    });
    return json['id'] as String;
  }

  Future<void> withdraw(String id) async {
    await _api.sendJson('POST', '/applications/$id/withdraw');
  }

  /// Reserve the place while the owner decides. Throws when the owner offers
  /// no reservation on this listing.
  Future<({String occupancyId, int feeCentavos})> reserve(String id) async {
    final json = await _api.sendJson('POST', '/applications/$id/reservation');
    return (
      occupancyId: json['occupancyId'] as String,
      feeCentavos: (json['feeCentavos'] as num).toInt(),
    );
  }

  static ApplicationView _toView(Map<String, dynamic> json) {
    final reservation = json['reservation'] as Map<String, dynamic>?;
    final approved = json['state'] == 'APPROVED';

    return ApplicationView(
      id: json['id'] as String,
      reference: json['reference'] as String? ?? '',
      listingTitle: json['listingTitle'] as String? ?? '',
      propertyName: json['propertyName'] as String? ?? '',
      areaLabel: [json['areaLabel'], json['cityLabel']]
          .whereType<String>()
          .where((part) => part.isNotEmpty)
          .join(', '),
      photo: json['photo'] as String? ?? '',
      monthlyCentavos: (json['monthlyRentCentavos'] as num?)?.toInt() ?? 0,
      moveIn: DateTime.parse(json['desiredMoveIn'] as String),
      submittedAt: DateTime.parse(json['createdAt'] as String),
      status: _status(json['state'] as String?),
      documents: (json['documentNames'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(growable: false),
      decidedAt: json['decidedAt'] == null
          ? null
          : DateTime.parse(json['decidedAt'] as String),
      reason: json['decisionReason'] as String?,
      // Only meaningful once approved: before that it is a number for a lease
      // that may never exist.
      moveInCostCentavos:
          approved ? (json['moveInCostCentavos'] as num?)?.toInt() : null,
      holdExpiresAt: reservation?['expiresAt'] == null
          ? null
          : DateTime.parse(reservation!['expiresAt'] as String),
    );
  }

  static ApplicationStatus _status(String? raw) => switch (raw) {
        'UNDER_REVIEW' => ApplicationStatus.underReview,
        'APPROVED' => ApplicationStatus.approved,
        'REJECTED' => ApplicationStatus.rejected,
        'WITHDRAWN' => ApplicationStatus.withdrawn,
        'EXPIRED' => ApplicationStatus.expired,
        _ => ApplicationStatus.submitted,
      };

  static String _iso(DateTime day) =>
      '${day.year.toString().padLeft(4, '0')}-'
      '${day.month.toString().padLeft(2, '0')}-'
      '${day.day.toString().padLeft(2, '0')}';
}

final applicationRepositoryProvider = Provider<ApplicationRepository>(
  (ref) => ApplicationRepository(ref.watch(apiClientProvider)),
);

/// The customer's applications. Empty when signed out — nobody to ask about.
final applicationsProvider = FutureProvider<List<ApplicationView>>((ref) async {
  ref.watch(sessionProvider);
  if (ref.watch(authRepositoryProvider).accessToken == null) return const [];

  try {
    return await ref.watch(applicationRepositoryProvider).mine();
  } on ApiException catch (error) {
    if (error.isUnauthorized) return const [];
    rethrow;
  }
});
