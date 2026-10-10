import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'api_client.dart';
import 'auth_repository.dart';
import 'listing_repository.dart';

const Duration kManilaOffset = Duration(hours: 8);
const int kViewingNoteMaxLength = 300;
const int kViewingDaysAhead = 30;
const Duration kViewingMinimumLead = Duration(minutes: 60);

DateTime manilaWallClock(DateTime instant) => instant.toUtc().add(kManilaOffset);

DateTime manilaDay(DateTime instant) {
  final local = manilaWallClock(instant);
  return DateTime.utc(local.year, local.month, local.day);
}

String isoDay(DateTime day) =>
    '${day.year.toString().padLeft(4, '0')}-${day.month.toString().padLeft(2, '0')}-${day.day.toString().padLeft(2, '0')}';

DateTime manilaInstant(DateTime day, int hour) =>
    DateTime.utc(day.year, day.month, day.day, hour).subtract(kManilaOffset);

enum ViewingTimeWindow {
  morning('MORNING', 'Morning', 8, 12),
  afternoon('AFTERNOON', 'Afternoon', 12, 16),
  evening('EVENING', 'Evening', 16, 20);

  const ViewingTimeWindow(this.wire, this.label, this.startHour, this.endHour);

  final String wire;
  final String label;
  final int startHour;
  final int endHour;

  String get rangeLabel => '${_hour(startHour)} – ${_hour(endHour)}';

  String get compactRangeLabel => '${_short(startHour)} – ${_short(endHour)}';

  String get spokenRange => '${_hour(startHour)} to ${_hour(endHour)}';

  bool isOpenOn(DateTime day, DateTime now) =>
      manilaInstant(day, endHour).difference(now.toUtc()) >= kViewingMinimumLead;

  static ViewingTimeWindow? fromWire(Object? raw) {
    for (final window in values) {
      if (window.wire == raw) return window;
    }
    return null;
  }

  static String _hour(int hour) => '${hour % 12 == 0 ? 12 : hour % 12}:00 ${hour >= 12 ? 'PM' : 'AM'}';

  static String _short(int hour) => '${hour % 12 == 0 ? 12 : hour % 12}${hour >= 12 ? 'PM' : 'AM'}';
}

List<DateTime> requestableDays(DateTime now) {
  final today = manilaDay(now);
  return [
    for (var offset = 0; offset <= kViewingDaysAhead; offset++) today.add(Duration(days: offset)),
  ].where((day) => ViewingTimeWindow.values.any((window) => window.isOpenOn(day, now))).toList(growable: false);
}

enum ViewingStatus { matching, requested, confirmed, rescheduleRequested, declined, completed, cancelled }

enum AssignmentState { assigned, matching, unassigned }

@immutable
class AssignedAgentView {
  const AssignedAgentView({
    required this.id,
    required this.displayName,
    required this.role,
    required this.photoUrl,
    required this.verified,
    required this.organizationName,
  });

  final String id;
  final String displayName;
  final String role;
  final String? photoUrl;
  final bool verified;
  final String organizationName;

  String get initials => displayName
      .trim()
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .take(2)
      .map((part) => part[0].toUpperCase())
      .join();

  static AssignedAgentView? fromJson(Object? raw) {
    if (raw is! Map<String, dynamic>) return null;
    final photo = raw['photoUrl'];
    return AssignedAgentView(
      id: raw['id'] as String,
      displayName: raw['displayName'] as String? ?? '',
      role: raw['role'] as String? ?? '',
      photoUrl: photo is String && photo.startsWith('http') ? photo : null,
      verified: raw['verified'] as bool? ?? false,
      organizationName: raw['organizationName'] as String? ?? '',
    );
  }
}

@immutable
class ViewingView {
  const ViewingView({
    required this.id,
    required this.listingId,
    required this.listingTitle,
    required this.listingPhoto,
    required this.place,
    required this.partnerName,
    required this.conversationId,
    required this.preferredDate,
    required this.preferredWindow,
    required this.scheduledAt,
    required this.status,
    required this.customerNote,
    required this.partnerNote,
    required this.agentChangeNotice,
    required this.updatedAt,
    this.createdAt,
    this.durationMinutes,
  });

  final String id;
  final String listingId;
  final String listingTitle;
  final String? listingPhoto;
  final String place;
  final String partnerName;
  final String conversationId;
  final DateTime? preferredDate;
  final ViewingTimeWindow? preferredWindow;
  final DateTime? scheduledAt;
  final ViewingStatus status;
  final String customerNote;
  final String partnerNote;
  final String? agentChangeNotice;
  final DateTime updatedAt;
  final DateTime? createdAt;
  final int? durationMinutes;

  bool get isConfirmed => status == ViewingStatus.confirmed || status == ViewingStatus.completed;

  DateTime? get confirmedStartAt => isConfirmed ? scheduledAt : null;

  DateTime? get confirmedEndAt {
    final start = confirmedStartAt;
    final minutes = durationMinutes;
    if (start == null || minutes == null || minutes <= 0) return null;
    return start.add(Duration(minutes: minutes));
  }

  String get preferredDayLabel {
    final day = preferredDate;
    return day == null ? '' : DateFormat('EEEE, MMMM d').format(day);
  }

  String get preferredWindowLabel {
    final window = preferredWindow;
    return window == null ? '' : '${window.label} (${window.rangeLabel})';
  }

  String? get confirmedDayLabel {
    final start = confirmedStartAt;
    return start == null ? null : DateFormat('EEEE, MMMM d').format(manilaWallClock(start));
  }

  String? get confirmedTimeLabel {
    final start = confirmedStartAt;
    if (start == null) return null;
    return DateFormat('h:mm a').format(manilaWallClock(start));
  }

  String? requestedAtLabel(DateTime now) {
    final at = createdAt;
    if (at == null) return null;
    final local = manilaWallClock(at);
    final time = DateFormat('h:mm a').format(local);
    final today = manilaDay(now);
    final day = DateTime.utc(local.year, local.month, local.day);
    if (day == today) return 'Today, ${DateFormat('MMM d').format(local)} · $time';
    return '${DateFormat('EEE, MMM d').format(local)} · $time';
  }

  bool get isActive =>
      status == ViewingStatus.matching ||
      status == ViewingStatus.requested ||
      status == ViewingStatus.confirmed ||
      status == ViewingStatus.rescheduleRequested;

  bool get canAcceptSuggestion => status == ViewingStatus.rescheduleRequested && scheduledAt != null;

  String get preferredLabel {
    final day = preferredDate;
    final window = preferredWindow;
    if (day == null || window == null) return '';
    return '${DateFormat('EEEE, MMMM d').format(day)} · ${window.label} (${window.rangeLabel})';
  }

  String? get scheduledLabel {
    final at = scheduledAt;
    return at == null ? null : DateFormat("EEEE, MMMM d 'at' h:mm a").format(manilaWallClock(at));
  }

  String get statusLabel => switch (status) {
        ViewingStatus.matching => 'Finding a specialist',
        ViewingStatus.requested => 'Agent confirming',
        ViewingStatus.confirmed => 'Confirmed',
        ViewingStatus.rescheduleRequested => scheduledAt == null ? 'New time requested' : 'New time suggested',
        ViewingStatus.declined => 'No specialist available',
        ViewingStatus.completed => 'Completed',
        ViewingStatus.cancelled => 'Cancelled',
      };

  static ViewingStatus statusFromWire(Object? raw) => switch (raw) {
        'MATCHING' => ViewingStatus.matching,
        'CONFIRMED' => ViewingStatus.confirmed,
        'RESCHEDULE_REQUESTED' => ViewingStatus.rescheduleRequested,
        'DECLINED' => ViewingStatus.declined,
        'COMPLETED' => ViewingStatus.completed,
        'CANCELLED' => ViewingStatus.cancelled,
        _ => ViewingStatus.requested,
      };

  static ViewingView fromJson(Map<String, dynamic> json) {
    final photo = json['listingPhoto'];
    final place = [json['areaLabel'], json['cityLabel']].whereType<String>().where((p) => p.isNotEmpty).join(', ');
    final preferred = json['preferredDate'] as String?;
    final scheduled = json['scheduledAt'] as String?;
    final notice = json['agentChangeNotice'] as String?;
    final created = json['createdAt'] as String?;
    final duration = json['durationMinutes'];
    return ViewingView(
      id: json['id'] as String,
      listingId: json['listingId'] as String,
      listingTitle: json['listingTitle'] as String? ?? '',
      listingPhoto: photo is String && photo.startsWith('http') ? photo : null,
      place: place,
      partnerName: (json['agentName'] as String?) ?? (json['organizationName'] as String? ?? ''),
      conversationId: json['conversationId'] as String,
      preferredDate: preferred == null ? null : DateTime.parse('${preferred}T00:00:00Z'),
      preferredWindow: ViewingTimeWindow.fromWire(json['preferredTimeWindow']),
      scheduledAt: scheduled == null ? null : DateTime.parse(scheduled),
      status: statusFromWire(json['status']),
      customerNote: json['customerNote'] as String? ?? '',
      partnerNote: json['partnerNote'] as String? ?? '',
      agentChangeNotice: notice == null || notice.isEmpty ? null : notice,
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      createdAt: created == null ? null : DateTime.tryParse(created),
      durationMinutes: duration is num ? duration.toInt() : null,
    );
  }
}

@immutable
class ViewingRequestView {
  const ViewingRequestView({required this.viewing, required this.assignmentState, required this.agent});

  final ViewingView viewing;
  final AssignmentState assignmentState;
  final AssignedAgentView? agent;

  static ViewingRequestView fromJson(Map<String, dynamic> json) => ViewingRequestView(
        viewing: ViewingView.fromJson(json['viewingRequest'] as Map<String, dynamic>),
        assignmentState: switch (json['assignmentState']) {
          'ASSIGNED' => AssignmentState.assigned,
          'MATCHING' => AssignmentState.matching,
          _ => AssignmentState.unassigned,
        },
        agent: AssignedAgentView.fromJson(json['assignedAgent']),
      );
}

class ViewingRepository {
  ViewingRepository(this._api);

  final ApiClient _api;

  Future<ViewingRequestView> request({
    required String listingId,
    required DateTime preferredDate,
    required ViewingTimeWindow window,
    required String note,
    required String idempotencyKey,
    String? referralCode,
  }) async {
    final body = await _api.sendJson(
      'POST',
      '/listings/$listingId/viewings',
      body: {
        'preferredDate': isoDay(preferredDate),
        'preferredTimeWindow': window.wire,
        'note': note.trim().isEmpty ? null : note.trim(),
        'idempotencyKey': idempotencyKey,
        'referralCode': referralCode,
      },
    );
    return ViewingRequestView.fromJson(body);
  }

  Future<ViewingRequestView> find(String viewingId) async =>
      ViewingRequestView.fromJson(await _api.getJson('/me/viewings/$viewingId'));

  Future<List<ViewingView>> mine() async {
    final body = await _api.getJson('/me/viewings');
    return (body['items'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(ViewingView.fromJson)
        .toList(growable: false);
  }

  Future<ViewingRequestView> cancel(String viewingId) => _act(viewingId, {'action': 'CANCEL'});

  Future<ViewingRequestView> acceptSuggestion(String viewingId) => _act(viewingId, {'action': 'ACCEPT_SUGGESTION'});

  Future<ViewingRequestView> reschedule(
          String viewingId, DateTime preferredDate, ViewingTimeWindow window, String note) =>
      _act(viewingId, {
        'action': 'RESCHEDULE',
        'preferredDate': isoDay(preferredDate),
        'preferredTimeWindow': window.wire,
        'note': note.trim().isEmpty ? null : note.trim(),
      });

  Future<ViewingRequestView> _act(String viewingId, Map<String, Object?> body) async =>
      ViewingRequestView.fromJson(await _api.sendJson('POST', '/me/viewings/$viewingId/action', body: body));
}

final viewingRepositoryProvider = Provider<ViewingRepository>(
  (ref) => ViewingRepository(ref.watch(apiClientProvider)),
);

final myViewingsProvider = FutureProvider.autoDispose<List<ViewingView>>((ref) {
  if (!ref.watch(isSignedInProvider)) return const [];
  return ref.watch(viewingRepositoryProvider).mine();
});

final activeViewingForListingProvider = Provider.autoDispose.family<ViewingView?, String>((ref, listingId) {
  final viewings = ref.watch(myViewingsProvider).valueOrNull ?? const <ViewingView>[];
  for (final viewing in viewings) {
    if (viewing.listingId == listingId && viewing.isActive) return viewing;
  }
  return null;
});
