import 'dart:convert';

import 'package:customer_app/app/app_config.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  AppConfig config(
          {String env = 'development',
          String api = 'http://localhost:8080',
          String key = 'sb_publishable_test',
          String? flavor,
          bool release = false}) =>
      AppConfig.parse(
          appEnv: env,
          apiBaseUrl: api,
          supabaseUrl: 'https://example.supabase.co',
          supabasePublishableKey: key,
          flavor: flavor,
          release: release);

  test('each environment is selected explicitly', () {
    for (final env in AppEnvironment.values) {
      expect(config(env: env.name, api: 'https://api.example.com').environment, env);
    }
  });
  test('missing and unknown environments never fall back', () {
    for (final env in ['', 'prod', 'unknown']) {
      expect(() => config(env: env), throwsA(isA<AppConfigurationError>()));
    }
  });
  test('invalid URLs and embedded credentials are rejected', () {
    for (final api in [
      '',
      'relative',
      'https://',
      'ftp://api.example.com',
      'https://user:password@api.example.com',
      'https://api.example.com?token=x'
    ]) {
      expect(() => config(api: api), throwsA(isA<AppConfigurationError>()));
    }
  });
  test('development supports simulator and emulator hosts', () {
    for (final api in ['http://localhost:8080', 'http://10.0.2.2:8080']) {
      expect(config(api: api).apiBaseUrl.toString(), api);
    }
  });
  test('staging and production require HTTPS in debug too', () {
    for (final env in ['staging', 'production']) {
      expect(() => config(env: env), throwsA(isA<AppConfigurationError>()));
    }
    expect(() => config(release: true), throwsA(isA<AppConfigurationError>()));
  });
  test('production rejects local endpoints even with HTTPS', () {
    for (final host in ['localhost', '127.0.0.1', '10.0.2.2', '192.168.0.2', '172.16.0.2', 'api.local']) {
      expect(() => config(env: 'production', api: 'https://$host'), throwsA(isA<AppConfigurationError>()));
    }
  });
  test('native flavor must match configuration', () {
    expect(() => config(flavor: 'production'), throwsA(isA<AppConfigurationError>()));
    expect(config(flavor: 'development').environment, AppEnvironment.development);
  });
  test('encoded service role and private keys cannot masquerade as public keys', () {
    String jwt(String role) => 'e30.${base64Url.encode(utf8.encode(jsonEncode({'role': role})))}.signature';
    for (final key in ['', 'sb_secret_test', jwt('service_role'), 'arbitrary']) {
      expect(() => config(key: key), throwsA(isA<AppConfigurationError>()));
    }
    expect(config(key: jwt('anon')).supabasePublishableKey, jwt('anon'));
  });
}
