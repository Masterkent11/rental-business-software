import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../app/app_config.dart';

typedef TokenSource = String? Function();

class ApiException implements Exception {
  const ApiException(
    this.message, {
    this.statusCode,
    this.code,
    this.isNetwork = false,
    this.isTimeout = false,
    this.cause,
  });

  final String message;
  final int? statusCode;
  final String? code;
  final bool isNetwork;
  final bool isTimeout;

  final Object? cause;

  bool get isNotFound => statusCode == 404;

  bool get isUnauthorized => statusCode == 401;

  bool get isConflict => statusCode == 409;

  bool get datesUnavailable => code == 'DATES_UNAVAILABLE';

  @override
  String toString() => 'ApiException($statusCode): $message${cause == null ? "" : " <- $cause"}';
}

const Duration kRequestTimeout = Duration(seconds: 20);

class ApiClient {
  ApiClient({http.Client? client, String? baseUrl, TokenSource? tokenSource})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? AppConfig.configuredApiBaseUrl,
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
        if (entry.value != null && entry.value!.isNotEmpty) entry.key: entry.value!,
    };

    final uri = Uri.parse('$_baseUrl$path').replace(queryParameters: cleaned.isEmpty ? null : cleaned);

    late final http.Response response;
    try {
      response = await _client.get(uri, headers: _headers()).timeout(kRequestTimeout);
    } catch (error) {
      throw _connectionFailure(error);
    }

    if (response.statusCode >= 400) throw _failure(response);

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
      response = await (() async {
        final streamed = await _client.send(request);
        return http.Response.fromStream(streamed);
      })()
          .timeout(kRequestTimeout);
    } catch (error) {
      throw _connectionFailure(error);
    }

    if (response.statusCode >= 400) throw _failure(response);

    if (response.bodyBytes.isEmpty) return const {};
    final decoded = jsonDecode(utf8.decode(response.bodyBytes));
    if (decoded is! Map<String, dynamic>) {
      throw const ApiException('Unexpected response shape');
    }
    return decoded;
  }

  ApiException _connectionFailure(Object error) => ApiException(
      error is TimeoutException
          ? 'The server took too long to respond. Please try again.'
          : 'Could not reach the server. Check your connection and try again.',
      isNetwork: error is! TimeoutException,
      isTimeout: error is TimeoutException,
      cause: error);

  ApiException _failure(http.Response response) {
    final status = response.statusCode;
    String? message;
    String? code;
    try {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is Map) {
        final candidate = decoded['message'] ?? decoded['title'];
        if (candidate is String && candidate.isNotEmpty) message = candidate;
        if (decoded['code'] is String) code = decoded['code'] as String;
      }
    } on FormatException {
      message = null;
    }
    if (status == 401) message = 'Your session expired. Please sign in again.';
    if ((status >= 500 && code != 'VERIFICATION_UNAVAILABLE') || message == null) {
      message = switch (status) {
        401 => 'Please sign in again.',
        403 => 'You do not have access to that.',
        404 => 'We could not find that. It may have been removed.',
        503 => 'The service is busy right now. Please try again.',
        _ => 'Something went wrong on our side. Please try again.',
      };
    }
    return ApiException(message, statusCode: status, code: code);
  }

  void close() => _client.close();
}
