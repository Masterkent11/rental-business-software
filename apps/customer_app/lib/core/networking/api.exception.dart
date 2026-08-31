class ApiException implements Exception {
  const ApiException(
    this.message, {
    this.statusCode,
    this.body,
    this.isNetwork = false,
    this.cause,
  });

  final String message;
  final int? statusCode;
  final dynamic body;
  final bool isNetwork;
  final Object? cause;

  bool get isNotFound => statusCode == 404;
  bool get isUnauthorized => statusCode == 401;
  bool get isConflict => statusCode == 409;
  bool get isForbidden => statusCode == 403;
  bool get isBadRequest => statusCode == 400;
  bool get isServerError => (statusCode ?? 0) >= 500;

  @override
  String toString() =>
      'ApiException($statusCode): $message${cause != null ? " <- $cause" : ""}';
}
