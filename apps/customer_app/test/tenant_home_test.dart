import 'dart:convert';

import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/tenant_home_repository.dart';
import 'package:customer_app/features/my_home/domain/tenant_home.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'support/tenant_home_fixture.dart';

void main() {
  test('PHP formatting preserves cents and Manila date boundaries', () {
    expect(peso(2500000), '₱25,000');
    expect(peso(2500050), '₱25,000.50');
    expect(dueLabel(DateTime.utc(2026, 10, 25), DateTime.parse('2026-10-24T16:00:00Z')), 'Due today');
    expect(dueLabel(DateTime.utc(2026, 10, 23), DateTime.parse('2026-10-24T00:00:00Z')), '1 day overdue');
    expect(dueLabel(DateTime.utc(2026, 10, 25), DateTime.parse('2026-10-24T00:00:00Z')), 'In 1 day');
  });
  test('lease progress clamps and exclusive end dates display their final occupied day', () {
    final home = homeFixture();
    expect(home.progress(DateTime.utc(2025)), 0);
    expect(home.progress(DateTime.utc(2028)), 1);
    expect(home.lastDay, DateTime.utc(2026, 12, 31));
    expect(home.remaining(DateTime.utc(2028)), 'Lease ended');
    expect(home.remaining(DateTime.utc(2026, 10, 24)), '2 months remaining');
  });
  test('settled invoices do not expose a rent obligation', () {
    expect(homeFixture(paid: true).nextInvoice, isNull);
    expect(homeFixture().nextInvoice!.outstanding, 2500000);
    expect(homeFixture().nextInvoice!.onlinePaymentAvailable, false);
  });
  test('missing optional data remains empty without inventing facts', () {
    final home = tenantHomeFromJson({'id': 'home'});
    expect(home.photos, isEmpty);
    expect(home.invoices, isEmpty);
    expect(home.remaining(DateTime.utc(2026)), 'Open-ended lease');
  });
  test('repository uses backend capabilities and reuses request id on maintenance retry', () async {
    final requests = <http.Request>[];
    final client = ApiClient(
        baseUrl: 'http://api.test',
        tokenSource: () => 'token',
        client: MockClient((request) async {
          requests.add(request);
          if (request.method == 'GET') {
            return http.Response(
                jsonEncode({
                  'capabilities': ['EXPLORE', 'TRIPS'],
                  'tenancies': [],
                  'hasTrips': true
                }),
                200);
          }
          return http.Response('{"conversationId":"thread"}', 200);
        }));
    addTearDown(client.close);
    final repository = ApiTenantHomeRepository(client);
    final context = await repository.experience();
    expect(context.hasTrips, true);
    expect(context.myHomeAvailable, false);
    await repository.requestMaintenance('home', 'Repair the leaking tap', 'stable-id');
    await repository.requestMaintenance('home', 'Repair the leaking tap', 'stable-id');
    expect(requests.last.url.path, '/me/tenancies/home/maintenance');
    expect(requests[1].body, requests[2].body);
    expect(requests.last.headers['authorization'], 'Bearer token');
  });
}
