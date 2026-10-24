import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/my_home/domain/tenant_home.dart';
import 'api_client.dart';
import 'auth_repository.dart';
import 'listing_repository.dart';
import 'preferences_store.dart';

abstract interface class TenantHomeRepository {
  Future<CustomerExperience> experience();
  Future<TenantHome> details(String tenancyId);
  Future<String> requestMaintenance(String tenancyId, String description, String clientId);
}

class ApiTenantHomeRepository implements TenantHomeRepository {
  ApiTenantHomeRepository(this._api);
  final ApiClient _api;
  @override
  Future<CustomerExperience> experience() async {
    final json = await _api.getJson('/me/home');
    List<TenantHome> homes(String key) =>
        (json[key] as List<dynamic>? ?? []).whereType<Map<String, dynamic>>().map(tenantHomeFromJson).toList();
    return CustomerExperience(
        capabilities: (json['capabilities'] as List<dynamic>? ?? []).whereType<String>().toList(),
        tenancies: homes('tenancies'),
        upcoming: homes('upcomingMoveIns'),
        history: homes('rentalHistory'),
        pendingApplications: (json['pendingApplications'] as num?)?.toInt() ?? 0,
        approvedApplications: (json['approvedApplications'] as num?)?.toInt() ?? 0,
        hasTrips: json['hasTrips'] == true);
  }

  @override
  Future<TenantHome> details(String tenancyId) async =>
      tenantHomeFromJson(await _api.getJson('/me/tenancies/${Uri.encodeComponent(tenancyId)}'));
  @override
  Future<String> requestMaintenance(String tenancyId, String description, String clientId) async {
    final result = await _api.sendJson('POST', '/me/tenancies/${Uri.encodeComponent(tenancyId)}/maintenance',
        body: {'description': description, 'clientId': clientId});
    return result['conversationId'] as String;
  }
}

DateTime? calendarDay(String? value) {
  final parsed = DateTime.tryParse(value ?? '');
  return parsed == null ? null : DateTime.utc(parsed.year, parsed.month, parsed.day);
}

TenantHome tenantHomeFromJson(Map<String, dynamic> json) => TenantHome(
      id: json['id'] as String,
      asOf: calendarDay(json['asOf'] as String?),
      title: json['title'] as String? ?? 'Your home',
      unit: json['unit'] as String? ?? '',
      address: json['address'] as String? ?? '',
      area: json['area'] as String? ?? '',
      propertyType: json['propertyType'] as String? ?? 'Not provided',
      description: json['description'] as String? ?? '',
      landlordName: json['landlordName'] as String? ?? 'Property management',
      listingId: json['listingId'] as String?,
      startsOn: calendarDay(json['startsOn'] as String?),
      endsOn: calendarDay(json['endsOn'] as String?),
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      photos: (json['photos'] as List<dynamic>? ?? []).whereType<String>().toList(),
      amenities: (json['amenities'] as List<dynamic>? ?? []).whereType<String>().toList(),
      rules: (json['rules'] as List<dynamic>? ?? []).whereType<String>().toList(),
      invoices: (json['invoices'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map((invoice) => TenantInvoice(
                id: invoice['id'] as String,
                number: (invoice['number'] as num).toInt(),
                dueOn: calendarDay(invoice['dueOn'] as String)!,
                total: (invoice['totalCentavos'] as num).toInt(),
                paid: (invoice['paidCentavos'] as num).toInt(),
                outstanding: (invoice['outstandingCentavos'] as num).toInt(),
                state: invoice['state'] as String,
                onlinePaymentAvailable: invoice['onlinePaymentAvailable'] == true,
                lines: (invoice['lines'] as List<dynamic>? ?? [])
                    .whereType<Map<String, dynamic>>()
                    .map((line) =>
                        (description: line['description'] as String, amount: (line['amountCentavos'] as num).toInt()))
                    .toList(),
              ))
          .toList(),
    );

final tenantHomeRepositoryProvider =
    Provider<TenantHomeRepository>((ref) => ApiTenantHomeRepository(ref.watch(apiClientProvider)));
final customerExperienceProvider = FutureProvider<CustomerExperience>((ref) async {
  ref.watch(sessionProvider);
  if (ref.watch(currentUserIdProvider) == null) return const CustomerExperience();
  return ref.watch(tenantHomeRepositoryProvider).experience();
});
final tenantHomesProvider = Provider<AsyncValue<List<TenantHome>>>((ref) {
  final context = ref.watch(customerExperienceProvider);
  if (context.isLoading) return const AsyncLoading();
  if (context.hasError) return AsyncError(context.error!, context.stackTrace!);
  final value = context.requireValue;
  return AsyncData(value.myHomeAvailable ? value.tenancies : []);
});
final tenancyDetailsProvider = FutureProvider.autoDispose.family<TenantHome, String>((ref, id) {
  ref.watch(sessionProvider);
  if (ref.watch(currentUserIdProvider) == null) {
    throw const ApiException('Sign in to view your tenancy.', statusCode: 401);
  }
  return ref.watch(tenantHomeRepositoryProvider).details(id);
});

class SelectedTenancy extends AsyncNotifier<String?> {
  @override
  Future<String?> build() async {
    final userId = ref.watch(currentUserIdProvider);
    final experience = await ref.watch(customerExperienceProvider.future);
    if (userId == null || experience.tenancies.isEmpty) return null;
    final stored = await ref.read(preferencesStoreProvider).read('tenancy.selection.$userId');
    return experience.tenancies.any((home) => home.id == stored) ? stored : experience.tenancies.first.id;
  }

  Future<void> select(String id) async {
    final userId = ref.read(currentUserIdProvider);
    if (userId == null) return;
    await ref.read(tenantHomeRepositoryProvider).details(id);
    if (ref.read(currentUserIdProvider) != userId) return;
    await ref.read(preferencesStoreProvider).write('tenancy.selection.$userId', id);
    if (ref.read(currentUserIdProvider) != userId) return;
    state = AsyncData(id);
  }
}

final selectedTenancyProvider = AsyncNotifierProvider<SelectedTenancy, String?>(SelectedTenancy.new);
