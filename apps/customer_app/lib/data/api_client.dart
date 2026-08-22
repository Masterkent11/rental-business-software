import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

/// Where the API lives.
///
/// Overridable at build time so a device on the same Wi-Fi can reach a laptop:
/// `flutter run --dart-define=API_BASE_URL=http://192.168.1.5:8080`.
///
/// The Android emulator reaches the host through 10.0.2.2, not localhost —
/// handled here rather than being rediscovered by whoever runs it next.
String _defaultBaseUrl() {
  const fromEnv = String.fromEnvironment('API_BASE_URL');
  if (fromEnv.isNotEmpty) return fromEnv;
  if (!kIsWebPlatform && Platform.isAndroid) return 'http://10.0.2.2:8080';
  return 'http://localhost:8080';
}

const bool kIsWebPlatform = bool.fromEnvironment('dart.library.js_util');

/// Supplies the current access token, or null when signed out.
typedef TokenSource = String? Function();

/// Something the API refused, or could not be asked.
///
/// Carries enough for a screen to say what happened without the screen having
/// to understand HTTP.
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

  /// The underlying failure. Kept because discarding it makes a transport bug
  /// indistinguishable from a dropped connection — which cost real debugging
  /// time the first time it happened.
  final Object? cause;

  bool get isNotFound => statusCode == 404;

  /// The session is gone or was never there — the screen should offer sign-in
  /// rather than an error.
  bool get isUnauthorized => statusCode == 401;

  @override
  String toString() =>
      'ApiException($statusCode): $message${cause == null ? "" : " <- $cause"}';
}

/// The HTTP transport.
///
/// Deliberately thin: it speaks JSON and throws [ApiException]. It knows
/// nothing about listings, and no screen knows anything about HTTP — repository
/// classes sit between them and do the mapping.
/// How long to wait before calling it a lost connection.
///
/// Twenty seconds, not the more usual ten. Two things push the tail out: a
/// Philippine mobile connection, and an API whose database may be a region
/// away — in development it demonstrably is, and the first burst of requests
/// after a cold start went past twelve seconds while the server was working
/// perfectly.
///
/// The cost of being generous is a customer waiting longer to see a failure.
/// The cost of being strict is telling them the server is unreachable when it
/// is merely far away, which is worse: one is slow, the other is a lie.
const Duration kRequestTimeout = Duration(seconds: 20);

class ApiClient {
  ApiClient({http.Client? client, String? baseUrl, TokenSource? tokenSource})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? _defaultBaseUrl(),
        _tokenSource = tokenSource;

  final http.Client _client;
  final String _baseUrl;

  /// Read fresh on every request rather than captured once: the SDK refreshes
  /// the access token in the background, and a token held from construction
  /// time would start failing an hour in.
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

    final uri = Uri.parse('$_baseUrl$path').replace(
      queryParameters: cleaned.isEmpty ? null : cleaned,
    );

    late final http.Response response;
    try {
      response = await _client
          .get(uri, headers: _headers())
          .timeout(kRequestTimeout);
    } catch (error) {
      // A phone on Philippine mobile data loses the connection routinely. That
      // is an ordinary state, not a crash, so it is typed rather than thrown
      // raw at a widget.
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
      final streamed =
          await _client.send(request).timeout(kRequestTimeout);
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

  /// problem+json carries `title`; fall back rather than surface raw HTML.
  String? _titleFrom(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map && decoded['title'] is String) {
        return decoded['title'] as String;
      }
    } catch (_) {
      // Not JSON. Nothing useful to show the customer.
    }
    return null;
  }

  void close() => _client.close();
}
