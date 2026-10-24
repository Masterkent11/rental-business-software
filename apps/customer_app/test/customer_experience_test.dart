import 'dart:async';

import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/auth_repository.dart';
import 'package:customer_app/data/preferences_store.dart';
import 'package:customer_app/data/tenant_home_repository.dart';
import 'package:customer_app/features/my_home/domain/tenant_home.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/tenant_home_fixture.dart';

class _Homes implements TenantHomeRepository {
  _Homes(this.load, this.find);
  final Future<CustomerExperience> Function() load;
  final Future<TenantHome> Function(String) find;
  @override
  Future<CustomerExperience> experience() => load();
  @override
  Future<TenantHome> details(String id) => find(id);
  @override
  Future<String> requestMaintenance(String id, String description, String clientId) => throw UnimplementedError();
}

void main() {
  test('account switch removes previous tenant data while the next context loads; logout stays empty', () async {
    final user = StateProvider<String?>((ref) => 'first');
    final pending = Completer<CustomerExperience>();
    var calls = 0;
    final container = ProviderContainer(overrides: [
      currentUserIdProvider.overrideWith((ref) => ref.watch(user)),
      sessionProvider.overrideWith((ref) => const Stream.empty()),
      tenantHomeRepositoryProvider.overrideWithValue(_Homes(
          () => ++calls == 1
              ? Future.value(CustomerExperience(capabilities: const ['MY_HOME'], tenancies: [homeFixture()]))
              : pending.future,
          (id) async => homeFixture(id: id))),
    ]);
    addTearDown(container.dispose);
    container.listen(tenantHomesProvider, (_, __) {});
    await container.read(customerExperienceProvider.future);
    expect(container.read(tenantHomesProvider).requireValue.single.id, 'home');
    container.read(user.notifier).state = 'second';
    expect(container.read(tenantHomesProvider).isLoading, true);
    expect(container.read(tenantHomesProvider).valueOrNull, isNull);
    pending.complete(const CustomerExperience());
    await container.read(customerExperienceProvider.future);
    expect(container.read(tenantHomesProvider).requireValue, isEmpty);
    container.read(user.notifier).state = null;
    await container.read(customerExperienceProvider.future);
    expect(container.read(tenantHomesProvider).requireValue, isEmpty);
    expect(calls, 2);
  });

  test('selection is scoped to the account, revalidated, and discarded after entitlement changes', () async {
    final preferences = MemoryPreferencesStore();
    await preferences.write('tenancy.selection.customer', 'foreign');
    var homes = [homeFixture(id: 'first'), homeFixture(id: 'second')];
    final checked = <String>[];
    final container = ProviderContainer(overrides: [
      currentUserIdProvider.overrideWithValue('customer'),
      sessionProvider.overrideWith((ref) => const Stream.empty()),
      preferencesStoreProvider.overrideWithValue(preferences),
      tenantHomeRepositoryProvider.overrideWithValue(
          _Homes(() async => CustomerExperience(capabilities: const ['MY_HOME'], tenancies: homes), (id) async {
        checked.add(id);
        return homes.firstWhere((home) => home.id == id,
            orElse: () => throw const ApiException('Not available', statusCode: 404));
      })),
    ]);
    addTearDown(container.dispose);
    expect(await container.read(selectedTenancyProvider.future), 'first');
    await container.read(selectedTenancyProvider.notifier).select('second');
    expect(checked, ['second']);
    expect(await preferences.read('tenancy.selection.customer'), 'second');
    await expectLater(container.read(selectedTenancyProvider.notifier).select('foreign'), throwsA(isA<ApiException>()));
    expect(container.read(selectedTenancyProvider).requireValue, 'second');
    homes = [homeFixture(id: 'first')];
    container.invalidate(customerExperienceProvider);
    expect(await container.read(selectedTenancyProvider.future), 'first');
  });

  test('a direct private detail request requires a signed-in account', () async {
    final container = ProviderContainer(overrides: [
      currentUserIdProvider.overrideWithValue(null),
      sessionProvider.overrideWith((ref) => const Stream.empty()),
    ]);
    addTearDown(container.dispose);
    await expectLater(container.read(tenancyDetailsProvider('cached-id').future), throwsA(isA<ApiException>()));
  });
}
