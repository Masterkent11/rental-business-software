import 'package:flutter/foundation.dart';

enum BootstrapStatus {
  idle,
  loading,
  ready,
  error,
}

@immutable
class AppBootstrapState {
  const AppBootstrapState({
    this.status = BootstrapStatus.idle,
    this.error,
  });

  const AppBootstrapState.idle() : this(status: BootstrapStatus.idle);
  const AppBootstrapState.loading() : this(status: BootstrapStatus.loading);
  const AppBootstrapState.ready() : this(status: BootstrapStatus.ready);
  const AppBootstrapState.error(Object error)
      : this(status: BootstrapStatus.error, error: error);

  final BootstrapStatus status;
  final Object? error;

  bool get isIdle => status == BootstrapStatus.idle;
  bool get isLoading => status == BootstrapStatus.loading;
  bool get isReady => status == BootstrapStatus.ready;
  bool get hasError => status == BootstrapStatus.error;
  bool get isCompleted => isReady || hasError;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AppBootstrapState &&
          runtimeType == other.runtimeType &&
          status == other.status &&
          error == other.error;

  @override
  int get hashCode => Object.hash(status, error);
}
