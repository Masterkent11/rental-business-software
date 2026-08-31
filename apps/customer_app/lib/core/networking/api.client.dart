import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:http/http.dart' as http;

import '../storage/in_memory_token_storage.adapter.dart';
import '../storage/token_storage.port.dart';
import 'api.config.dart';
import 'api.exception.dart';

typedef TokenProvider = String? Function();

class ApiClient {
  ApiClient({
    http.Client? client,
    http.Client? httpClient,
    ApiConfig? config,
    String? baseUrl,
    TokenStoragePort? tokenStorage,
    TokenProvider? tokenProvider,
    TokenProvider? tokenSource,
  })  : _client = client ?? httpClient ?? http.Client(),
        _baseUrl = config?.baseUrl ?? baseUrl ?? 'http://localhost:3000',
        _tokenStorage = tokenStorage ?? InMemoryTokenStorage(),
        _tokenProvider = tokenProvider ?? tokenSource;

  final http.Client _client;
  final String _baseUrl;
  final TokenStoragePort _tokenStorage;
  final TokenProvider? _tokenProvider;

  void close() => _client.close();

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String?>? query,
    Map<String, dynamic>? queryParameters,
  }) async {
    final mergedQuery = <String, String>{};
    if (query != null) {
      for (final entry in query.entries) {
        if (entry.value != null) mergedQuery[entry.key] = entry.value!;
      }
    }
    if (queryParameters != null) {
      for (final entry in queryParameters.entries) {
        if (entry.value != null) mergedQuery[entry.key] = entry.value.toString();
      }
    }

    final res = await get(path, queryParameters: mergedQuery.isEmpty ? null : mergedQuery);
    if (res is Map<String, dynamic>) return res;
    if (res is Map) return Map<String, dynamic>.from(res);
    return <String, dynamic>{'data': res};
  }

  Future<Map<String, dynamic>> postJson(
    String path, [
    Object? body = const {},
  ]) async {
    final res = await post(path, body: body);
    if (res is Map<String, dynamic>) return res;
    if (res is Map) return Map<String, dynamic>.from(res);
    return <String, dynamic>{'data': res};
  }

  Future<Map<String, dynamic>> deleteJson(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final res = await delete(path);
    if (res is Map<String, dynamic>) return res;
    if (res is Map) return Map<String, dynamic>.from(res);
    return <String, dynamic>{'data': res};
  }

  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final uri = _buildUri(path, queryParameters);
    try {
      final headers = await _headers();
      final response = await _client.get(uri, headers: headers);
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        'Network error: $e',
        isNetwork: true,
        statusCode: 0,
        cause: e,
      );
    }
  }

  Future<dynamic> post(
    String path, {
    dynamic body,
    Map<String, dynamic>? queryParameters,
  }) async {
    final uri = _buildUri(path, queryParameters);
    try {
      final headers = await _headers();
      final encodedBody = body != null ? jsonEncode(body) : null;
      final response = await _client.post(uri, headers: headers, body: encodedBody);
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        'Network error: $e',
        isNetwork: true,
        statusCode: 0,
        cause: e,
      );
    }
  }

  Future<dynamic> delete(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final uri = _buildUri(path, queryParameters);
    try {
      final headers = await _headers();
      final response = await _client.delete(uri, headers: headers);
      return _handleResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        'Network error: $e',
        isNetwork: true,
        statusCode: 0,
        cause: e,
      );
    }
  }

  Future<ui.Image> getImage(String url) async {
    final uri = Uri.parse(url.startsWith('http') ? url : '$_baseUrl$url');
    final headers = await _headers();
    final response = await _client.get(uri, headers: headers);
    if (response.statusCode != 200) {
      throw ApiException(
        'Failed to load image ($url)',
        statusCode: response.statusCode,
      );
    }
    final completer = Completer<ui.Image>();
    ui.decodeImageFromList(
      Uint8List.fromList(response.bodyBytes),
      completer.complete,
    );
    return completer.future;
  }

  Uri _buildUri(String path, Map<String, dynamic>? queryParameters) {
    final base = Uri.parse(_baseUrl);
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final query = <String, String>{};
    if (queryParameters != null) {
      for (final entry in queryParameters.entries) {
        if (entry.value != null) {
          query[entry.key] = entry.value.toString();
        }
      }
    }
    return base.replace(
      path: '${base.path.replaceAll(RegExp(r'/+$'), '')}$cleanPath',
      queryParameters: query.isEmpty ? null : query,
    );
  }

  Future<Map<String, String>> _headers() async {
    final headers = <String, String>{
      'accept': 'application/json',
      'content-type': 'application/json; charset=utf-8',
    };
    final token = _tokenProvider != null
        ? _tokenProvider()
        : await _tokenStorage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      headers['authorization'] = 'Bearer $token';
    }
    return headers;
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return <String, dynamic>{};
      try {
        return jsonDecode(response.body);
      } catch (_) {
        return response.body;
      }
    }

    String message = 'HTTP Error ${response.statusCode}';
    Map<String, dynamic> bodyMap = {};
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        bodyMap = decoded;
        if (decoded['message'] != null) {
          message = decoded['message'] is List
              ? (decoded['message'] as List).join(', ')
              : decoded['message'].toString();
        } else if (decoded['title'] != null) {
          message = decoded['title'].toString();
        }
      }
    } catch (_) {
      if (response.body.isNotEmpty) {
        message = response.body;
      }
    }

    throw ApiException(
      message,
      statusCode: response.statusCode,
      body: bodyMap,
    );
  }
}
