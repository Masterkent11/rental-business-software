import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'listing_repository.dart';

enum NightStatus { open, held, booked, leased, blocked }

extension NightStatusX on NightStatus {
  bool get isTaken => this != NightStatus.open;
}

typedef NightView = ({DateTime night, NightStatus status});

class AvailabilityRepository {
  AvailabilityRepository(this._api);

  final ApiClient _api;

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
        .map(
          (night) => (
            night: DateTime.parse(night['night'] as String),
            status: _status(night['status'] as String?),
          ),
        )
        .toList(growable: false);
  }

  static NightStatus _status(String? raw) => switch (raw) {
    'HELD' => NightStatus.held,
    'BOOKED' => NightStatus.booked,
    'LEASED' => NightStatus.leased,
    'BLOCKED' => NightStatus.blocked,
    _ when raw != 'OPEN' && raw != null => NightStatus.blocked,
    _ => NightStatus.open,
  };

  static String _iso(DateTime day) =>
      '${day.year.toString().padLeft(4, '0')}-'
      '${day.month.toString().padLeft(2, '0')}-'
      '${day.day.toString().padLeft(2, '0')}';
}

final availabilityRepositoryProvider = Provider<AvailabilityRepository>(
  (ref) => AvailabilityRepository(ref.watch(apiClientProvider)),
);

typedef AvailabilityRequest = ({String resourceId, DateTime from, DateTime to});

final availabilityProvider =
    FutureProvider.family<List<NightView>, AvailabilityRequest>(
      (ref, request) => ref
          .watch(availabilityRepositoryProvider)
          .nights(
            resourceId: request.resourceId,
            from: request.from,
            to: request.to,
          ),
    );
