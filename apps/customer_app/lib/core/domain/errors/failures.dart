import '../result/result.dart';

export '../result/result.dart' show Failure;

/// Network failure (offline, connection timeout, DNS error).
class NetworkFailure extends Failure {
  const NetworkFailure(super.message, {super.cause});
}

/// Unauthorized (401) - session expired or missing credentials.
class UnauthorizedFailure extends Failure {
  const UnauthorizedFailure(super.message, {super.cause});
}

/// Forbidden (403) - user lacks permission.
class ForbiddenFailure extends Failure {
  const ForbiddenFailure(super.message, {super.cause});
}

/// Resource not found (404).
class NotFoundFailure extends Failure {
  const NotFoundFailure(super.message, {super.cause});
}

/// Conflict / Business state rejection (409) - e.g. dates taken, duplicate hold.
class ConflictFailure extends Failure {
  const ConflictFailure(super.message, {super.cause});
}

/// Validation failure (400) - malformed parameters or client constraint violated.
class ValidationFailure extends Failure {
  const ValidationFailure(super.message, {super.cause});
}

/// Server / internal error (500, 502, 503).
class ServerFailure extends Failure {
  const ServerFailure(super.message, {super.cause});
}

/// Unknown / unexpected failure.
class UnknownFailure extends Failure {
  const UnknownFailure(super.message, {super.cause});
}
