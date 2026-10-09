import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'auth_repository.dart';
import 'listing_repository.dart';
import 'preferences_store.dart';

enum ContentStatus { draft, approved }

@immutable
class ContentPageView {
  const ContentPageView({
    required this.slug,
    required this.version,
    required this.title,
    required this.summary,
    required this.body,
    required this.status,
    required this.requiresAcceptance,
    required this.effectiveOn,
  });

  final String slug;
  final int version;
  final String title;
  final String summary;
  final String body;
  final ContentStatus status;
  final bool requiresAcceptance;
  final String? effectiveOn;

  bool get isDraft => status == ContentStatus.draft;

  static ContentPageView fromJson(Map<String, dynamic> json) => ContentPageView(
        slug: json['slug'] as String,
        version: (json['version'] as num).toInt(),
        title: json['title'] as String? ?? '',
        summary: json['summary'] as String? ?? '',
        body: json['body'] as String? ?? '',
        status: json['status'] == 'APPROVED' ? ContentStatus.approved : ContentStatus.draft,
        requiresAcceptance: json['requiresAcceptance'] as bool? ?? false,
        effectiveOn: json['effectiveOn'] as String?,
      );
}

@immutable
class PolicyReference {
  const PolicyReference({required this.slug, required this.version});

  final String slug;
  final int version;

  String encode() => '$slug@$version';

  static PolicyReference? decode(String raw) {
    final parts = raw.split('@');
    final version = parts.length == 2 ? int.tryParse(parts[1]) : null;
    return version == null ? null : PolicyReference(slug: parts[0], version: version);
  }

  Map<String, dynamic> toJson() => {'slug': slug, 'version': version};
}

enum AcceptanceContext {
  signUp('SIGN_UP'),
  booking('BOOKING');

  const AcceptanceContext(this.apiValue);

  final String apiValue;
}

enum SupportTopic {
  account('ACCOUNT', 'My account'),
  booking('BOOKING', 'A booking'),
  payment('PAYMENT', 'A payment'),
  listingReport('LISTING_REPORT', 'Report a listing'),
  inquiryViewing('INQUIRY_VIEWING', 'An inquiry or viewing'),
  privacy('PRIVACY', 'Privacy or my data'),
  other('OTHER', 'Something else');

  const SupportTopic(this.apiValue, this.label);

  final String apiValue;
  final String label;

  static SupportTopic fromApi(String? value) =>
      values.firstWhere((topic) => topic.apiValue == value, orElse: () => SupportTopic.other);
}

const List<String> kSignUpPolicies = ['terms', 'privacy'];
const String kPendingAcceptanceKey = 'consent.pending_sign_up';

class ContentRepository {
  ContentRepository(this._api);

  final ApiClient _api;

  Future<ContentPageView> page(String slug) async => ContentPageView.fromJson(await _api.getJson('/content/$slug'));

  Future<List<ContentPageView>> list({required bool help}) async {
    final body = await _api.getJson('/content', query: {'kind': help ? 'HELP' : 'LEGAL'});
    return (body['items'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map((item) => ContentPageView.fromJson({...item, 'body': ''}))
        .toList(growable: false);
  }

  Future<void> accept(List<PolicyReference> documents, AcceptanceContext context, {String? relatedId}) async {
    await _api.sendJson(
      'POST',
      '/me/policy-acceptances',
      body: {
        'documents': [for (final doc in documents) doc.toJson()],
        'context': context.apiValue,
        'relatedId': relatedId,
      },
    );
  }

  Future<void> contactSupport({
    required String email,
    required SupportTopic topic,
    required String message,
    required String clientRef,
    String? listingId,
  }) async {
    await _api.sendJson(
      'POST',
      '/support/requests',
      body: {
        'email': email,
        'topic': topic.apiValue,
        'message': message,
        'listingId': listingId,
        'clientRef': clientRef,
      },
    );
  }
}

final contentRepositoryProvider = Provider<ContentRepository>((ref) => ContentRepository(ref.watch(apiClientProvider)));

final contentPageProvider = FutureProvider.autoDispose.family<ContentPageView, String>(
  (ref, slug) => ref.watch(contentRepositoryProvider).page(slug),
);

final helpArticlesProvider = FutureProvider.autoDispose<List<ContentPageView>>(
  (ref) => ref.watch(contentRepositoryProvider).list(help: true),
);

class ConsentRecorder {
  ConsentRecorder(this._ref);

  final Ref _ref;

  Future<List<PolicyReference>> currentSignUpPolicies() async {
    final repository = _ref.read(contentRepositoryProvider);
    final pages = await Future.wait(kSignUpPolicies.map(repository.page));
    return [for (final page in pages) PolicyReference(slug: page.slug, version: page.version)];
  }

  Future<void> rememberPending(List<PolicyReference> documents) =>
      _ref.read(preferencesStoreProvider).writeList(kPendingAcceptanceKey, [for (final d in documents) d.encode()]);

  Future<bool> flushPending() async {
    if (!_ref.read(isSignedInProvider)) return false;
    final store = _ref.read(preferencesStoreProvider);
    final pending =
        (await store.readList(kPendingAcceptanceKey)).map(PolicyReference.decode).whereType<PolicyReference>().toList();
    if (pending.isEmpty) return false;
    await _ref.read(contentRepositoryProvider).accept(pending, AcceptanceContext.signUp);
    await store.remove(kPendingAcceptanceKey);
    return true;
  }
}

final consentRecorderProvider = Provider<ConsentRecorder>((ref) => ConsentRecorder(ref));
