import 'dart:convert';

import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/features/discovery/discovery_controller.dart';
import 'package:customer_app/fixtures/view_models.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// The client's half of the contract.
///
/// These assert that the app reads exactly what `docs/04-api/README.md`
/// documents — and, just as importantly, that it **adds no rules of its own**.
/// Filtering, publishing, and availability are the server's decisions; a client
/// that re-derived them would be a second source of truth.
ListingRepository repositoryReturning(
  Object body, {
  int status = 200,
  void Function(Uri uri)? onRequest,
}) {
  final client = MockClient((request) async {
    onRequest?.call(request.url);
    return http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
  });
  return ListingRepository(ApiClient(client: client, baseUrl: 'http://test'));
}

const _item = {
  'id': 'c1111111-0000-0000-0000-000000000001',
  'title': 'One-bedroom corner unit',
  'description': 'Corner unit.',
  'propertyName': 'ABC Apartment',
  'areaLabel': 'Brgy. Kamputhaw',
  'cityLabel': 'Cebu City',
  'kind': 'LONG_TERM',
  'resourceType': 'UNIT',
  'priceCentavos': 850000,
  'currency': 'PHP',
  'hasTour': true,
  'sceneCount': 5,
  'photos': ['https://example.test/a.jpg'],
  'availabilityLabel': 'Available now',
  'isAvailable': true,
  'amenities': ['Inverter aircon'],
  'houseRules': ['No pets'],
  'terms': ['12-month minimum term'],
  'minStayNights': null,
  'sharedFacilities': <String>[],
  'ownerName': 'Santos Property Holdings',
  'ownerVerified': true,
};

void main() {
  test('maps the documented response into a card', () async {
    final repo = repositoryReturning({'items': [_item], 'limit': 20, 'offset': 0});
    final results = await repo.search(const DiscoveryFilters());

    expect(results, hasLength(1));
    final card = results.single;
    expect(card.title, 'One-bedroom corner unit');
    // Integer centavos end to end (P-06) — never parsed as a double.
    expect(card.priceCentavos, 850000);
    expect(card.kind, ListingKind.longTerm);
    expect(card.resourceType, ResourceType.unit);
    // Availability is rendered, not computed.
    expect(card.availabilityLabel, 'Available now');
    expect(card.isAvailable, isTrue);
  });

  test('sends filters as query parameters instead of filtering locally', () async {
    Uri? seen;
    final repo = repositoryReturning(
      {'items': <dynamic>[], 'limit': 20, 'offset': 0},
      onRequest: (uri) => seen = uri,
    );

    await repo.search(const DiscoveryFilters(
      query: 'Apas',
      kind: ListingKind.shortTerm,
      type: ResourceType.unit,
      maxCentavos: 200000,
      tourOnly: true,
    ));

    // The server decides what matches. If these stopped being sent, the app
    // would silently show the wrong results while looking like it worked.
    expect(seen!.queryParameters['q'], 'Apas');
    expect(seen!.queryParameters['kind'], 'SHORT_TERM');
    expect(seen!.queryParameters['type'], 'UNIT');
    expect(seen!.queryParameters['maxPrice'], '200000');
    expect(seen!.queryParameters['hasTour'], 'true');
  });

  test('omits absent filters rather than sending empty values', () async {
    Uri? seen;
    final repo = repositoryReturning(
      {'items': <dynamic>[], 'limit': 20, 'offset': 0},
      onRequest: (uri) => seen = uri,
    );

    await repo.search(const DiscoveryFilters());

    expect(seen!.queryParameters.containsKey('q'), isFalse);
    expect(seen!.queryParameters.containsKey('kind'), isFalse);
    expect(seen!.queryParameters.containsKey('hasTour'), isFalse);
  });

  test('maps the detail fields the listing screen needs', () async {
    final repo = repositoryReturning(_item);
    final detail = await repo.detail('c1111111-0000-0000-0000-000000000001');

    expect(detail, isNotNull);
    expect(detail!.amenities, ['Inverter aircon']);
    expect(detail.houseRules, ['No pets']);
    expect(detail.ownerName, 'Santos Property Holdings');
    expect(detail.ownerVerified, isTrue);
  });

  test('non-ASCII survives the round trip', () async {
    // "Brgy. Osmeña" is ordinary Philippine text. A response without
    // charset=utf-8 decodes as latin-1 and mangles it, so this guards the
    // encoding end of the contract rather than assuming it.
    final repo = repositoryReturning({
      'items': [
        {..._item, 'areaLabel': 'Brgy. Osmeña', 'title': 'Malingin · Cebu'},
      ],
      'limit': 20,
      'offset': 0,
    });

    final card = (await repo.search(const DiscoveryFilters())).single;
    expect(card.areaLabel, 'Brgy. Osmeña');
    expect(card.title, 'Malingin · Cebu');
  });

  test('a 404 is absence, not an error to show the customer', () async {
    // The API does not distinguish "gone" from "never published" (D-12), and
    // neither does the app — it shows the listing as gone.
    final repo = repositoryReturning({'title': 'Listing not found'}, status: 404);
    expect(await repo.detail('c1111111-0000-0000-0000-000000000001'), isNull);
  });

  test('a server error surfaces as a typed failure, not a crash', () async {
    final repo = repositoryReturning({'title': 'Boom'}, status: 500);
    expect(
      () => repo.search(const DiscoveryFilters()),
      throwsA(isA<ApiException>()),
    );
  });

  test('an unreachable server is a network failure the UI can explain', () async {
    final client = MockClient((_) async => throw const SocketExceptionStub());
    final repo = ListingRepository(
      ApiClient(client: client, baseUrl: 'http://test'),
    );

    await expectLater(
      () => repo.search(const DiscoveryFilters()),
      throwsA(
        isA<ApiException>().having((e) => e.isNetwork, 'isNetwork', isTrue),
      ),
    );
  });
}

/// Stands in for a dropped connection without needing a real socket.
class SocketExceptionStub implements Exception {
  const SocketExceptionStub();
}
