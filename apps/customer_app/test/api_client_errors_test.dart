import 'dart:async';
import 'dart:io';
import 'package:customer_app/data/api_client.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  for (final method in ['GET', 'POST']) {
    test('$method distinguishes network and timeout failures', () async {
      for (final failure in [const SocketException('offline'), TimeoutException('timeout')]) {
        final api = ApiClient(baseUrl: 'http://test', client: MockClient((_) async => throw failure));
        addTearDown(api.close);
        await expectLater(
            method == 'GET' ? api.getJson('/draft') : api.sendJson(method, '/draft'),
            throwsA(isA<ApiException>()
                .having((e) => e.isNetwork, 'network', failure is SocketException)
                .having((e) => e.isTimeout, 'timeout', failure is TimeoutException)));
      }
    });
    test('$method handles auth and server errors without exposing internals', () async {
      for (final status in [401, 500, 503]) {
        final api = ApiClient(
            baseUrl: 'http://test',
            client: MockClient(
                (_) async => http.Response('{"message":"private database password","code":"INTERNAL"}', status)));
        addTearDown(api.close);
        await expectLater(
            method == 'GET' ? api.getJson('/draft') : api.sendJson(method, '/draft'),
            throwsA(isA<ApiException>()
                .having((e) => e.statusCode, 'HTTP status', status)
                .having((e) => e.message.contains('private database'), 'safe message', false)
                .having((e) => e.isUnauthorized, 'auth expired', status == 401)));
      }
    });
  }
}
