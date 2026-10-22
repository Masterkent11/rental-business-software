import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../fixtures/view_models.dart';
import 'api_client.dart';
import 'auth_repository.dart';
import 'listing_repository.dart';

const List<String> kSuggestedInquiryQuestions = [
  'Is this available?',
  'Can I schedule a viewing?',
  'Can you share more details?',
  'Can you share the pricing details privately?',
  'Are there other similar properties?',
];

enum InquiryProgress { sent, inProgress, closed }

@immutable
class InquiryView {
  const InquiryView({
    required this.id,
    required this.listingId,
    required this.listingTitle,
    required this.listingPhoto,
    required this.place,
    required this.partnerName,
    required this.conversationId,
    required this.message,
    required this.questions,
    required this.buyerBudgetCentavos,
    required this.progress,
    required this.responded,
    required this.createdAt,
  });

  final String id;
  final String listingId;
  final String listingTitle;
  final String? listingPhoto;
  final String place;
  final String partnerName;
  final String conversationId;
  final String message;
  final List<String> questions;
  final int? buyerBudgetCentavos;
  final InquiryProgress progress;
  final bool responded;
  final DateTime createdAt;

  String get progressLabel => switch (progress) {
        InquiryProgress.sent => responded ? 'Replied' : 'Sent',
        InquiryProgress.inProgress => 'In progress',
        InquiryProgress.closed => 'Closed',
      };

  static InquiryView fromJson(Map<String, dynamic> json) => InquiryView(
        id: json['id'] as String,
        listingId: json['listingId'] as String,
        listingTitle: json['listingTitle'] as String? ?? '',
        listingPhoto: _httpUrl(json['listingPhoto']),
        place: _place(json),
        partnerName: (json['agentName'] as String?) ?? (json['organizationName'] as String? ?? 'Owner'),
        conversationId: json['conversationId'] as String,
        message: json['message'] as String? ?? '',
        questions: (json['questions'] as List<dynamic>? ?? const []).whereType<String>().toList(growable: false),
        buyerBudgetCentavos: (json['buyerBudgetCentavos'] as num?)?.toInt(),
        progress: switch (json['status']) {
          'CLOSED' => InquiryProgress.closed,
          'IN_PROGRESS' => InquiryProgress.inProgress,
          _ => InquiryProgress.sent,
        },
        responded: json['responded'] as bool? ?? false,
        createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
      );
}

@immutable
class InquiryResult {
  const InquiryResult({required this.inquiry, required this.alreadyOpen});

  final InquiryView inquiry;
  final bool alreadyOpen;
}

@immutable
class AgentProfileView {
  const AgentProfileView({
    required this.id,
    required this.displayName,
    required this.headline,
    required this.bio,
    required this.photoUrl,
    required this.verified,
    required this.licenseAuthority,
    required this.specialties,
    required this.areasServed,
    required this.languages,
    required this.memberSince,
    required this.activeListings,
    required this.respondedWithinDayRate,
    required this.medianResponseMinutes,
    required this.listings,
  });

  final String id;
  final String displayName;
  final String headline;
  final String bio;
  final String? photoUrl;
  final bool verified;
  final String? licenseAuthority;
  final List<String> specialties;
  final List<String> areasServed;
  final List<String> languages;
  final DateTime memberSince;
  final int activeListings;
  final double? respondedWithinDayRate;
  final int? medianResponseMinutes;
  final List<ListingCardView> listings;
}

@immutable
class AreaView {
  const AreaView({
    required this.cityLabel,
    required this.latitude,
    required this.longitude,
    required this.rentCount,
    required this.saleCount,
  });

  final String cityLabel;
  final double latitude;
  final double longitude;
  final int rentCount;
  final int saleCount;
}

String? _httpUrl(Object? raw) => raw is String && raw.startsWith('http') ? raw : null;

String _place(Map<String, dynamic> json) {
  final parts = [json['areaLabel'], json['cityLabel']].whereType<String>().where((p) => p.isNotEmpty);
  return parts.join(', ');
}

List<String> _strings(Object? raw) => (raw as List<dynamic>? ?? const []).whereType<String>().toList(growable: false);

class MarketplaceRepository {
  MarketplaceRepository(this._api);

  final ApiClient _api;

  Future<InquiryResult> submitInquiry({
    required String listingId,
    required String message,
    required List<String> questions,
    required int? buyerBudgetCentavos,
    required String clientRef,
  }) async {
    final body = await _api.sendJson(
      'POST',
      '/listings/$listingId/inquiries',
      body: {
        'message': message,
        'questions': questions,
        'buyerBudgetCentavos': buyerBudgetCentavos,
        'clientRef': clientRef,
      },
    );
    return InquiryResult(
      inquiry: InquiryView.fromJson(body['inquiry'] as Map<String, dynamic>),
      alreadyOpen: body['alreadyOpen'] as bool? ?? false,
    );
  }

  Future<InquiryView?> openInquiryFor(String listingId) async {
    final body = await _api.getJson('/me/listings/$listingId/inquiry');
    final raw = body['inquiry'];
    return raw is Map<String, dynamic> ? InquiryView.fromJson(raw) : null;
  }

  Future<List<InquiryView>> myInquiries() async {
    final body = await _api.getJson('/me/inquiries');
    return (body['items'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(InquiryView.fromJson)
        .toList(growable: false);
  }

  Future<AgentProfileView?> agent(String agentId) async {
    try {
      final body = await _api.getJson('/agents/$agentId');
      final agent = body['agent'] as Map<String, dynamic>;
      final stats = body['stats'] as Map<String, dynamic>? ?? const {};
      return AgentProfileView(
        id: agent['id'] as String,
        displayName: agent['displayName'] as String? ?? 'Agent',
        headline: agent['headline'] as String? ?? '',
        bio: agent['bio'] as String? ?? '',
        photoUrl: _httpUrl(agent['photoUrl']),
        verified: agent['verified'] as bool? ?? false,
        licenseAuthority: agent['licenseAuthority'] as String?,
        specialties: _strings(agent['specialties']),
        areasServed: _strings(agent['areasServed']),
        languages: _strings(agent['languages']),
        memberSince: DateTime.parse(agent['memberSince'] as String).toLocal(),
        activeListings: (stats['activeListings'] as num?)?.toInt() ?? 0,
        respondedWithinDayRate: (stats['respondedWithinDayRate'] as num?)?.toDouble(),
        medianResponseMinutes: (stats['medianResponseMinutes'] as num?)?.toInt(),
        listings: (body['listings'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(ListingRepository.toCard)
            .toList(growable: false),
      );
    } on ApiException catch (error) {
      if (error.isNotFound) return null;
      rethrow;
    }
  }

  Future<List<AreaView>> areas() async {
    final body = await _api.getJson('/locations/areas');
    return (body['items'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(
          (area) => AreaView(
            cityLabel: area['cityLabel'] as String? ?? '',
            latitude: (area['latitude'] as num).toDouble(),
            longitude: (area['longitude'] as num).toDouble(),
            rentCount: (area['rentCount'] as num?)?.toInt() ?? 0,
            saleCount: (area['saleCount'] as num?)?.toInt() ?? 0,
          ),
        )
        .where((area) => area.cityLabel.isNotEmpty)
        .toList(growable: false);
  }
}

final marketplaceRepositoryProvider = Provider<MarketplaceRepository>(
  (ref) => MarketplaceRepository(ref.watch(apiClientProvider)),
);

final openInquiryProvider = FutureProvider.autoDispose.family<InquiryView?, String>((ref, listingId) async {
  if (!ref.watch(isSignedInProvider)) return null;
  return ref.watch(marketplaceRepositoryProvider).openInquiryFor(listingId);
});

final myInquiriesProvider = FutureProvider.autoDispose<List<InquiryView>>((ref) {
  if (!ref.watch(isSignedInProvider)) return const [];
  return ref.watch(marketplaceRepositoryProvider).myInquiries();
});

final agentProfileProvider = FutureProvider.autoDispose.family<AgentProfileView?, String>(
  (ref, agentId) => ref.watch(marketplaceRepositoryProvider).agent(agentId),
);

final areasProvider = FutureProvider<List<AreaView>>(
  (ref) => ref.watch(marketplaceRepositoryProvider).areas(),
);
