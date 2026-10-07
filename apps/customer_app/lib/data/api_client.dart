import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

String _defaultBaseUrl() {
  const fromEnv = String.fromEnvironment('API_BASE_URL');
  if (fromEnv.isNotEmpty) return fromEnv;
  if (!kIsWebPlatform && Platform.isAndroid) return 'http://10.0.2.2:8080';
  return 'http://localhost:8080';
}

const bool kIsWebPlatform = bool.fromEnvironment('dart.library.js_util');

typedef TokenSource = String? Function();

class ApiException implements Exception {
  const ApiException(
    this.message, {
    this.statusCode,
    this.isNetwork = false,
    this.cause,
  });

  final String message;
  final int? statusCode;
  final bool isNetwork;

  final Object? cause;

  bool get isNotFound => statusCode == 404;

  bool get isUnauthorized => statusCode == 401;

  @override
  String toString() =>
      'ApiException($statusCode): $message${cause == null ? "" : " <- $cause"}';
}

const Duration kRequestTimeout = Duration(seconds: 20);

class ApiClient {
  ApiClient({http.Client? client, String? baseUrl, TokenSource? tokenSource})
    : _client = client ?? http.Client(),
      _baseUrl = baseUrl ?? _defaultBaseUrl(),
      _tokenSource = tokenSource;

  final http.Client _client;
  final String _baseUrl;

  String get baseUrl => _baseUrl;

  final TokenSource? _tokenSource;

  Map<String, String> _headers() {
    final token = _tokenSource?.call();
    return {
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String?> query = const {},
  }) async {
    final cleaned = <String, String>{
      for (final entry in query.entries)
        if (entry.value != null && entry.value!.isNotEmpty)
          entry.key: entry.value!,
    };

    final uri = Uri.parse('$_baseUrl$path')
        .replace(queryParameters: cleaned.isEmpty ? null : cleaned);

    late final http.Response response;
    try {
      response = await _client
          .get(uri, headers: _headers())
          .timeout(kRequestTimeout);
    } catch (error) {
      throw ApiException(
        'Could not reach the server. Check your connection and try again.',
        isNetwork: true,
        cause: error,
      );
    }

    if (response.statusCode >= 400) {
      throw ApiException(
        _titleFrom(response.body) ?? 'Request failed',
        statusCode: response.statusCode,
      );
    }

    final decoded = jsonDecode(utf8.decode(response.bodyBytes));
    if (decoded is! Map<String, dynamic>) {
      throw const ApiException('Unexpected response shape');
    }
    return decoded;
  }

  Future<Map<String, dynamic>> sendJson(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$_baseUrl$path');
    final request = http.Request(method, uri)
      ..headers.addAll({
        ..._headers(),
        if (body != null) 'content-type': 'application/json',
      });
    if (body != null) request.body = jsonEncode(body);

    late final http.Response response;
    try {
      final streamed = await _client.send(request).timeout(kRequestTimeout);
      response = await http.Response.fromStream(streamed);
    } catch (error) {
      throw ApiException(
        'Could not reach the server. Check your connection and try again.',
        isNetwork: true,
        cause: error,
      );
    }

    if (response.statusCode >= 400) {
      throw ApiException(
        _titleFrom(response.body) ?? 'Request failed',
        statusCode: response.statusCode,
      );
    }

    if (response.bodyBytes.isEmpty) return const {};
    final decoded = jsonDecode(utf8.decode(response.bodyBytes));
    if (decoded is! Map<String, dynamic>) {
      throw const ApiException('Unexpected response shape');
    }
    return decoded;
  }

  String? _titleFrom(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map && decoded['title'] is String) {
        return decoded['title'] as String;
      }
    } catch (_) {}
    return null;
  }

  void close() => _client.close();
}
