import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'listing_repository.dart';

/// What one night is, as far as a customer is concerned.
///
/// The server decides this. A client that worked out whether a night was free
/// would be a second source of truth about occupancy, which is exactly what
/// U-01 forbids — and it would be the stale one.
enum NightStatus { open, held, booked, leased, blocked }

extension NightStatusX on NightStatus {
  /// Everything except [open] means the customer cannot have it.
  bool get isTaken => this != NightStatus.open;
}

typedef NightView = ({DateTime night, NightStatus status});

class AvailabilityRepository {
  AvailabilityRepository(this._api);

  final ApiClient _api;

  /// The nightly calendar for a resource, over a half-open `[from, to)` range.
  Future<List<NightView>> nights({
    required String resourceId,
    required DateTime from,
    required DateTime to,
  }) async {
    final body = await _api.getJson(
      '/resources/$resourceId/availability',
      query: {'from': _iso(from), 'to': _iso(to)},
    );

    return (body['nights'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map((night) => (
              night: DateTime.parse(night['night'] as String),
              status: _status(night['status'] as String?),
            ))
        .toList(growable: false);
  }

  static NightStatus _status(String? raw) => switch (raw) {
        'HELD' => NightStatus.held,
        'BOOKED' => NightStatus.booked,
        'LEASED' => NightStatus.leased,
        'BLOCKED' => NightStatus.blocked,
        // An unknown status is treated as unavailable rather than free. If the
        // server grows a state this build has never heard of, offering the
        // night anyway risks selling something that is gone; refusing it only
        // risks an unnecessary "not available".
        _ when raw != 'OPEN' && raw != null => NightStatus.blocked,
        _ => NightStatus.open,
      };

  static String _iso(DateTime day) => '${day.year.toString().padLeft(4, '0')}-'
      '${day.month.toString().padLeft(2, '0')}-'
      '${day.day.toString().padLeft(2, '0')}';
}

final availabilityRepositoryProvider = Provider<AvailabilityRepository>(
  (ref) => AvailabilityRepository(ref.watch(apiClientProvider)),
);

typedef AvailabilityRequest = ({String resourceId, DateTime from, DateTime to});

/// The calendar for one resource over one window.
final availabilityProvider =
    FutureProvider.family<List<NightView>, AvailabilityRequest>(
  (ref, request) => ref.watch(availabilityRepositoryProvider).nights(
        resourceId: request.resourceId,
        from: request.from,
        to: request.to,
      ),
);
