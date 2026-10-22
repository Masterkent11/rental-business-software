import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/clock.dart';
import '../../data/api_client.dart';
import '../../data/auth_repository.dart';
import '../../data/ids.dart';
import '../../data/messaging_repository.dart';
import '../../data/viewing_repository.dart';

enum RequestViewingUiState { form, loading, submitting, matching, pendingConfirmation, confirmed, failure }

enum MatchingStep { submitting, checkingAvailability, assigningSpecialist }

enum MatchingStepState { pending, active, done }

typedef ViewingRequestKey = ({String listingId, String? rescheduleId});

final viewingStepMinimumProvider = Provider<Duration>((ref) => const Duration(milliseconds: 900));

final viewingMatchingDwellProvider = viewingStepMinimumProvider;

final viewingReconcileIntervalProvider = Provider<Duration>((ref) => const Duration(seconds: 30));

RequestViewingUiState outcomeStateFor(ViewingRequestView result) =>
    result.viewing.isConfirmed ? RequestViewingUiState.confirmed : RequestViewingUiState.pendingConfirmation;

@immutable
class RequestViewingState {
  const RequestViewingState({
    required this.days,
    required this.selectedDay,
    required this.window,
    required this.note,
    required this.ui,
    required this.result,
    required this.error,
    required this.now,
  });

  final List<DateTime> days;
  final DateTime? selectedDay;
  final ViewingTimeWindow? window;
  final String note;
  final RequestViewingUiState ui;
  final ViewingRequestView? result;
  final String? error;
  final DateTime now;

  bool get isWorking =>
      ui == RequestViewingUiState.submitting ||
      ui == RequestViewingUiState.matching ||
      ui == RequestViewingUiState.loading;

  bool get hasOutcome => ui == RequestViewingUiState.pendingConfirmation || ui == RequestViewingUiState.confirmed;

  bool get canSubmit =>
      selectedDay != null &&
      window != null &&
      window!.isOpenOn(selectedDay!, now) &&
      note.length <= kViewingNoteMaxLength &&
      !isWorking &&
      !hasOutcome;

  MatchingStepState stepState(MatchingStep step) {
    final reached = switch (ui) {
      RequestViewingUiState.submitting => 0,
      RequestViewingUiState.matching => 2,
      RequestViewingUiState.pendingConfirmation || RequestViewingUiState.confirmed => 3,
      _ => 0,
    };
    if (step.index < reached) return MatchingStepState.done;
    if (step.index == reached) return MatchingStepState.active;
    return MatchingStepState.pending;
  }

  RequestViewingState copyWith({
    DateTime? selectedDay,
    ViewingTimeWindow? window,
    bool clearWindow = false,
    String? note,
    RequestViewingUiState? ui,
    ViewingRequestView? result,
    String? error,
    bool clearError = false,
  }) =>
      RequestViewingState(
        days: days,
        selectedDay: selectedDay ?? this.selectedDay,
        window: clearWindow ? null : (window ?? this.window),
        note: note ?? this.note,
        ui: ui ?? this.ui,
        result: result ?? this.result,
        error: clearError ? null : (error ?? this.error),
        now: now,
      );
}

class RequestViewingController extends AutoDisposeFamilyNotifier<RequestViewingState, ViewingRequestKey> {
  final String _idempotencyKey = newUuid();
  StreamSubscription<void>? _live;
  Timer? _reconcile;
  bool _disposed = false;
  String? _trackedId;

  @override
  RequestViewingState build(ViewingRequestKey key) {
    ref.onDispose(() {
      _disposed = true;
      _stopWatching();
    });
    final now = ref.watch(clockProvider)();
    final days = requestableDays(now);
    return RequestViewingState(
      days: days,
      selectedDay: days.isEmpty ? null : days.first,
      window: null,
      note: '',
      ui: RequestViewingUiState.form,
      result: null,
      error: null,
      now: now,
    );
  }

  void selectDay(DateTime day) {
    if (state.isWorking || state.hasOutcome) return;
    final window = state.window;
    state = state.copyWith(selectedDay: day, clearWindow: window != null && !window.isOpenOn(day, state.now));
  }

  void selectWindow(ViewingTimeWindow window) {
    if (state.isWorking || state.hasOutcome) return;
    if (state.selectedDay == null || !window.isOpenOn(state.selectedDay!, state.now)) return;
    state = state.copyWith(window: window);
  }

  void updateNote(String note) => state = state.copyWith(note: note);

  void editAgain() {
    if (state.ui != RequestViewingUiState.failure || state.result != null) return;
    state = state.copyWith(ui: RequestViewingUiState.form, clearError: true);
  }

  Future<void> submit() async {
    final day = state.selectedDay;
    final window = state.window;
    if (!state.canSubmit || day == null || window == null) return;
    final started = Stopwatch()..start();
    state = state.copyWith(ui: RequestViewingUiState.submitting, clearError: true);
    final repository = ref.read(viewingRepositoryProvider);
    try {
      final rescheduleId = arg.rescheduleId;
      final result = rescheduleId == null
          ? await repository.request(
              listingId: arg.listingId,
              preferredDate: day,
              window: window,
              note: state.note,
              idempotencyKey: _idempotencyKey,
            )
          : await repository.reschedule(rescheduleId, day, window, state.note);
      if (_disposed) return;
      ref.invalidate(myViewingsProvider);
      state = state.copyWith(ui: RequestViewingUiState.matching, result: result);
      final remaining = ref.read(viewingStepMinimumProvider) - started.elapsed;
      if (remaining > Duration.zero) await Future<void>.delayed(remaining);
      if (_disposed) return;
      state = state.copyWith(ui: outcomeStateFor(state.result ?? result));
      _watch(result.viewing.id);
    } on ApiException catch (error) {
      if (!_disposed) state = state.copyWith(ui: RequestViewingUiState.failure, error: error.message);
    } catch (_) {
      if (!_disposed) {
        state = state.copyWith(
          ui: RequestViewingUiState.failure,
          error: 'Please check your connection and try again.',
        );
      }
    }
  }

  Future<void> track(String viewingId) async {
    if (state.result?.viewing.id == viewingId) return;
    _trackedId = viewingId;
    state = state.copyWith(ui: RequestViewingUiState.loading, clearError: true);
    try {
      final result = await ref.read(viewingRepositoryProvider).find(viewingId);
      if (_disposed) return;
      state = state.copyWith(ui: outcomeStateFor(result), result: result);
      _watch(viewingId);
    } on ApiException catch (error) {
      if (!_disposed) state = state.copyWith(ui: RequestViewingUiState.failure, error: error.message);
    } catch (_) {
      if (!_disposed) {
        state = state.copyWith(
          ui: RequestViewingUiState.failure,
          error: 'Please check your connection and try again.',
        );
      }
    }
  }

  Future<void> retry() {
    final tracked = _trackedId;
    if (tracked != null && state.result == null) return track(tracked);
    return submit();
  }

  Future<void> reconcile() async {
    final current = state.result;
    if (current == null || !state.hasOutcome) return;
    try {
      final fresh = await ref.read(viewingRepositoryProvider).find(current.viewing.id);
      if (_disposed || fresh.viewing.updatedAt.isBefore(state.result!.viewing.updatedAt)) return;
      state = state.copyWith(result: fresh, ui: outcomeStateFor(fresh));
      ref.invalidate(myViewingsProvider);
    } on ApiException {
      return;
    }
  }

  Future<void> acceptSuggestion() => _apply((repository, id) => repository.acceptSuggestion(id));

  Future<void> cancel() => _apply((repository, id) => repository.cancel(id));

  Future<void> _apply(Future<ViewingRequestView> Function(ViewingRepository, String) action) async {
    final current = state.result;
    if (current == null) return;
    try {
      final updated = await action(ref.read(viewingRepositoryProvider), current.viewing.id);
      if (_disposed) return;
      state = state.copyWith(result: updated, ui: outcomeStateFor(updated), clearError: true);
      ref.invalidate(myViewingsProvider);
    } on ApiException catch (error) {
      if (!_disposed) state = state.copyWith(error: error.message);
    }
  }

  void _watch(String viewingId) {
    _stopWatching();
    if (ref.read(currentUserIdProvider) == null) return;
    _live = ref.read(realtimeGatewayProvider).viewingChangesFor(viewingId).listen((_) => reconcile());
    _reconcile = Timer.periodic(ref.read(viewingReconcileIntervalProvider), (_) {
      if (state.result?.viewing.isActive ?? false) reconcile();
    });
  }

  void _stopWatching() {
    _live?.cancel();
    _live = null;
    _reconcile?.cancel();
    _reconcile = null;
  }
}

final requestViewingControllerProvider =
    NotifierProvider.autoDispose.family<RequestViewingController, RequestViewingState, ViewingRequestKey>(
  RequestViewingController.new,
);
