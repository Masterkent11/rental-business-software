import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show appFlavor;

enum AppEnvironment { development, staging, production }

class AppConfigurationError implements Exception {
  const AppConfigurationError(this.message);
  final String message;
  @override
  String toString() => message;
}

class AppConfig {
  const AppConfig({
    required this.environment,
    required this.apiBaseUrl,
    required this.supabaseUrl,
    required this.supabasePublishableKey,
  });

  final AppEnvironment environment;
  final Uri apiBaseUrl;
  final Uri supabaseUrl;
  final String supabasePublishableKey;

  static const configuredApiBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const configuredAppEnv = String.fromEnvironment('APP_ENV');
  static const configuredSupabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const configuredSupabaseKey = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');

  factory AppConfig.fromBuild() => AppConfig.parse(
        appEnv: configuredAppEnv,
        apiBaseUrl: configuredApiBaseUrl,
        supabaseUrl: configuredSupabaseUrl,
        supabasePublishableKey: configuredSupabaseKey,
        release: kReleaseMode || kProfileMode,
        flavor: appFlavor,
      );

  factory AppConfig.parse({
    required String appEnv,
    required String apiBaseUrl,
    required String supabaseUrl,
    required String supabasePublishableKey,
    bool release = false,
    String? flavor,
  }) {
    final environments = AppEnvironment.values.where((value) => value.name == appEnv);
    if (environments.isEmpty) {
      throw const AppConfigurationError('APP_ENV must be development, staging, or production.');
    }
    final environment = environments.single;
    if (flavor != null && flavor != appEnv) {
      throw const AppConfigurationError('The native flavor and APP_ENV must match.');
    }
    final https = release || environment != AppEnvironment.development;
    Uri endpoint(String value, String name) {
      final uri = Uri.tryParse(value);
      if (uri == null ||
          !uri.hasAuthority ||
          uri.host.isEmpty ||
          !['http', 'https'].contains(uri.scheme) ||
          uri.userInfo.isNotEmpty ||
          uri.hasQuery ||
          uri.hasFragment) {
        throw AppConfigurationError('$name must be an absolute HTTP(S) URL without credentials, query, or fragment.');
      }
      if (https && uri.scheme != 'https') {
        throw const AppConfigurationError('Staging, production, and release builds require HTTPS.');
      }
      if (environment == AppEnvironment.production &&
          (uri.host == 'localhost' ||
              uri.host == '::1' ||
              RegExp(r'^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)').hasMatch(uri.host) ||
              uri.host.endsWith('.local'))) {
        throw const AppConfigurationError('Production cannot use a local development endpoint.');
      }
      return uri;
    }

    final key = supabasePublishableKey.trim();
    var isPublic = key.startsWith('sb_publishable_');
    if (!isPublic && key.split('.').length == 3) {
      try {
        final payload = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(key.split('.')[1]))));
        isPublic = payload is Map && payload['role'] == 'anon';
      } on FormatException {
        isPublic = false;
      }
    }
    if (!isPublic) {
      throw const AppConfigurationError('Only a Supabase publishable or legacy anon key may ship in the app.');
    }
    return AppConfig(
      environment: environment,
      apiBaseUrl: endpoint(apiBaseUrl, 'API_BASE_URL'),
      supabaseUrl: endpoint(supabaseUrl, 'SUPABASE_URL'),
      supabasePublishableKey: key,
    );
  }
}
