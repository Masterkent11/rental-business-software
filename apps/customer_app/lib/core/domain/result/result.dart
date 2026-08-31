/// Functional Result type representing either a [Success] with value [T]
/// or a [FailureResult] with an error representation.
sealed class Result<T> {
  const Result();

  /// Creates a successful result.
  const factory Result.ok(T data) = Success<T>;

  /// Creates a failed result.
  const factory Result.err(Failure failure) = FailureResult<T>;

  /// Returns true if this is a [Success].
  bool get isOk => this is Success<T>;

  /// Returns true if this is a [FailureResult].
  bool get isErr => this is FailureResult<T>;

  /// Gets the contained data if ok, or null otherwise.
  T? get dataOrNull => switch (this) {
        Success(data: final d) => d,
        FailureResult() => null,
      };

  /// Gets the contained failure if err, or null otherwise.
  Failure? get failureOrNull => switch (this) {
        Success() => null,
        FailureResult(failure: final f) => f,
      };

  /// Transforms the success value with [mapper].
  Result<R> map<R>(R Function(T data) mapper) => switch (this) {
        Success(data: final d) => Result.ok(mapper(d)),
        FailureResult(failure: final f) => Result.err(f),
      };

  /// Executes [onSuccess] or [onError] depending on the result.
  R when<R>({
    required R Function(T data) onSuccess,
    required R Function(Failure failure) onError,
  }) =>
      switch (this) {
        Success(data: final d) => onSuccess(d),
        FailureResult(failure: final f) => onError(f),
      };
}

/// A successful [Result] containing [data].
final class Success<T> extends Result<T> {
  const Success(this.data);
  final T data;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is Success<T> && other.data == data);

  @override
  int get hashCode => data.hashCode;

  @override
  String toString() => 'Result.ok($data)';
}

/// A failed [Result] containing a [failure].
final class FailureResult<T> extends Result<T> {
  const FailureResult(this.failure);
  final Failure failure;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is FailureResult<T> && other.failure == failure);

  @override
  int get hashCode => failure.hashCode;

  @override
  String toString() => 'Result.err($failure)';
}

/// Base class for all domain / application failures.
abstract class Failure {
  const Failure(this.message, {this.cause});

  final String message;
  final Object? cause;

  @override
  String toString() => '$runtimeType: $message${cause != null ? " ($cause)" : ""}';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Failure &&
          other.runtimeType == runtimeType &&
          other.message == message);

  @override
  int get hashCode => Object.hash(runtimeType, message);
}
