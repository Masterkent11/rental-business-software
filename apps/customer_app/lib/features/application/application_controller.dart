import 'dart:async';
import 'dart:typed_data';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/api_client.dart';
import '../../data/ids.dart';
import '../../app/clock.dart';
import '../../data/application_repository.dart';
import '../../data/auth_repository.dart';
import '../../data/verification_repository.dart';
import 'domain/verification.dart';
import '../../fixtures/view_models.dart';
import 'domain/verification_capture.dart';
import 'domain/verification_repository.dart';

enum ApplicationStep { details, verification, review, submitted }

class ApplicationFlowState {
  const ApplicationFlowState(
      {required this.moveIn,
      this.occupants = 1,
      this.termMonths = 12,
      this.message = '',
      this.draft,
      this.session,
      this.step = ApplicationStep.details,
      this.busy = false,
      this.loading = true,
      this.error,
      this.restoreFailed = false,
      this.documentPreview,
      this.facePreview,
      this.applicationId});
  final DateTime moveIn;
  final int occupants;
  final int termMonths;
  final String message;
  final ApplicationDraft? draft;
  final VerificationSession? session;
  final ApplicationStep step;
  final bool busy;
  final bool loading;
  final String? error;
  final bool restoreFailed;
  final String? applicationId;
  final Uint8List? documentPreview;
  final Uint8List? facePreview;
  ApplicationFlowState copy(
          {DateTime? moveIn,
          int? occupants,
          int? termMonths,
          String? message,
          ApplicationDraft? draft,
          VerificationSession? session,
          ApplicationStep? step,
          bool? busy,
          bool? loading,
          String? error,
          bool? restoreFailed,
          Uint8List? documentPreview,
          Uint8List? facePreview,
          bool clearDocumentPreview = false,
          bool clearFacePreview = false,
          String? applicationId}) =>
      ApplicationFlowState(
          moveIn: moveIn ?? this.moveIn,
          occupants: occupants ?? this.occupants,
          termMonths: termMonths ?? this.termMonths,
          message: message ?? this.message,
          draft: draft ?? this.draft,
          session: session ?? this.session,
          step: step ?? this.step,
          busy: busy ?? this.busy,
          loading: loading ?? this.loading,
          error: error,
          restoreFailed: restoreFailed ?? this.restoreFailed,
          documentPreview: clearDocumentPreview ? null : documentPreview ?? this.documentPreview,
          facePreview: clearFacePreview ? null : facePreview ?? this.facePreview,
          applicationId: applicationId ?? this.applicationId);
}

class ApplicationFlowController extends StateNotifier<ApplicationFlowState> {
  ApplicationFlowController(this._verification, this._applications, this.resourceId, this._now)
      : super(ApplicationFlowState(moveIn: _now().add(const Duration(days: 14)))) {
    unawaited(restore());
  }
  final VerificationRepository _verification;
  final ApplicationRepository _applications;
  final String resourceId;
  final Clock _now;
  bool _disposed = false;
  Timer? _poll;
  bool _refreshing = false;
  bool _foreground = true;

  bool _restoring = false;
  bool _edited = false;

  Future<void> restore() async {
    if (_disposed || _restoring || state.busy) return;
    _restoring = true;
    state = state.copy(loading: true, restoreFailed: false);
    try {
      final draft = await _verification.findDraft(resourceId);
      if (_disposed || draft == null) return;
      state = state.copy(
          draft: draft,
          moveIn: _edited ? state.moveIn : draft.moveIn,
          occupants: _edited ? state.occupants : draft.occupants,
          termMonths: _edited ? state.termMonths : draft.termMonths,
          message: _edited ? state.message : draft.message,
          applicationId: draft.applicationId,
          step: draft.applicationId == null ? ApplicationStep.details : ApplicationStep.submitted);
    } on ApiException catch (e) {
      if (!_disposed) state = state.copy(error: e.message, restoreFailed: true);
    } catch (_) {
      if (!_disposed) {
        state = state.copy(error: 'Could not load your saved progress. Please try again.', restoreFailed: true);
      }
    } finally {
      _restoring = false;
      if (!_disposed) state = state.copy(loading: false, error: state.error);
    }
  }

  void _acceptSession(VerificationSession session) {
    if (_disposed) return;
    state = state.copy(
        session: session,
        clearDocumentPreview: ![
          VerificationStatus.frontReady,
          VerificationStatus.ocrProcessing,
          VerificationStatus.ocrReview
        ].contains(session.status),
        clearFacePreview: ![VerificationStatus.verifying, VerificationStatus.verified].contains(session.status));
  }

  void finishVerificationPresentation() {
    if (_disposed ||
        state.step != ApplicationStep.verification ||
        state.session?.status != VerificationStatus.verified) {
      return;
    }
    state = state.copy(step: ApplicationStep.review, clearDocumentPreview: true, clearFacePreview: true);
  }

  ListingCardView? _policy;

  void configureListing(ListingCardView card) {
    _policy = card;
    if (!_edited && state.draft == null) {
      final term = state.termMonths.clamp(card.minLeaseMonths ?? 1, card.maxLeaseMonths ?? 60);
      state = state.copy(termMonths: term);
    }
  }

  bool get canSubmitPending => _policy?.allowPendingIdentityApplication == true;

  void reviewPendingApplication() {
    if (!_disposed && !state.busy && canSubmitPending && state.session?.status == VerificationStatus.manualReview) {
      _poll?.cancel();
      state = state.copy(step: ApplicationStep.review, clearDocumentPreview: true, clearFacePreview: true);
    }
  }

  void edit({DateTime? moveIn, int? occupants, int? termMonths, String? message}) {
    if (_disposed || state.busy) return;
    _edited = true;
    state = state.copy(moveIn: moveIn, occupants: occupants, termMonths: termMonths, message: message);
  }

  Future<void> continueToVerification() => _run(() async {
        final today = _now();
        final day = DateTime(today.year, today.month, today.day);
        if (state.moveIn.isBefore(day) ||
            state.occupants < 1 ||
            state.occupants > (_policy?.maxGuests ?? 50) ||
            state.termMonths < (_policy?.minLeaseMonths ?? 1) ||
            state.termMonths > (_policy?.maxLeaseMonths ?? 60) ||
            state.message.length > 2000) {
          throw const ApiException('Check the move-in date, occupant limit and rental term for this place.');
        }
        final draft = await _verification.saveDraft(
            resourceId: resourceId,
            moveIn: state.moveIn,
            occupants: state.occupants,
            termMonths: state.termMonths,
            message: state.message);
        if (_disposed) return;
        final session = await _verification.resume(draft.id);
        if (_disposed) return;
        state = state.copy(draft: draft, session: session, step: ApplicationStep.verification);
        _acceptSession(session);
        if (session.status == VerificationStatus.detailsConfirmed) {
          _acceptSession(await _verification.prepareChallenge(session.id));
        }
        _schedule();
      });
  Future<void> consent() => _change((s) => _verification.consent(s.id));
  Future<void> front(VerificationCapture capture) => _change((s) {
        state = state.copy(documentPreview: capture.bytes);
        return _verification.captureFront(
            s.id, newUuid(), capture.bytes, capture.ocr!.details, capture.ocr!.confidence);
      });
  Future<void> confirm(IdentityDetails details) => _run(() async {
        final error = details.validate(_now());
        if (error != null) throw ApiException(error);
        final s = await _verification.confirmDetails(state.session!.id, details);
        _acceptSession(s);
        if (!_disposed) _acceptSession(await _verification.prepareChallenge(s.id));
      });
  Future<void> prepareChallenge() => _change((s) => _verification.prepareChallenge(s.id));
  Future<void> face(VerificationCapture capture) => _run(() async {
        final current = await _verification.status(state.session!.id);
        if (_disposed) return;
        _acceptSession(current);
        if (current.status != VerificationStatus.challengeActive) return;
        if (current.instruction != capture.instruction) {
          throw const ApiException('The face challenge changed. Follow the updated instruction and capture again.');
        }
        state = state.copy(facePreview: capture.bytes);
        final captured = await _verification.captureFace(current, newUuid(), capture.bytes);
        _acceptSession(captured);
        final result = await _verification.status(current.id);
        _acceptSession(result);
        _schedule();
      });
  Future<void> restart() => _run(() async {
        final current = state.session;
        if (current != null &&
            current.status != VerificationStatus.expired &&
            current.status != VerificationStatus.cancelled) {
          await _verification.cancel(current.id);
        }
        final session = await _verification.resume(state.draft!.id);
        _acceptSession(session);
      });
  Future<void> _change(Future<VerificationSession> Function(VerificationSession) action) => _run(() async {
        final session = await action(state.session!);
        _acceptSession(session);
        _schedule();
      });
  Future<void> refresh() async {
    if (_disposed || state.session == null || _refreshing || state.busy) return;
    _refreshing = true;
    try {
      final session = await _verification.status(state.session!.id);
      if (!_disposed && session.id == state.session?.id && session.version >= state.session!.version) {
        _acceptSession(session);
      }
    } on ApiException catch (e) {
      if (!_disposed) state = state.copy(error: e.message);
    } finally {
      _refreshing = false;
      _schedule();
    }
  }

  void setForeground(bool foreground) {
    _foreground = foreground;
    _poll?.cancel();
    if (foreground) unawaited(refresh());
  }

  void _schedule() {
    _poll?.cancel();
    if (_disposed || !_foreground) return;
    final session = state.session;
    if (session != null && (session.pending || session.status == VerificationStatus.challengeActive)) {
      _poll = Timer(const Duration(seconds: 3), refresh);
    } else if (session?.status == VerificationStatus.manualReview && state.step == ApplicationStep.verification) {
      _poll = Timer(const Duration(seconds: 15), refresh);
    }
  }

  void backToDetails() {
    _poll?.cancel();
    state = state.copy(step: ApplicationStep.details, clearDocumentPreview: true, clearFacePreview: true);
  }

  Future<void> submit() => _run(() async {
        if (state.step != ApplicationStep.review) return;
        final persisted = await _verification.findDraft(resourceId);
        if (_disposed) return;
        if (persisted?.id == state.draft!.id && persisted?.applicationId != null) {
          state = state.copy(applicationId: persisted!.applicationId, step: ApplicationStep.submitted);
          return;
        }
        final current = await _verification.status(state.session!.id);
        if (_disposed) return;
        _acceptSession(current);
        if (current.status != VerificationStatus.verified &&
            !(canSubmitPending && current.status == VerificationStatus.manualReview)) {
          state = state.copy(step: ApplicationStep.verification);
          throw const ApiException('Your verification is no longer valid. Verify again before submitting.');
        }
        final id = await _applications.submit(
            draftId: state.draft!.id,
            resourceId: resourceId,
            desiredMoveIn: state.moveIn,
            desiredTermMonths: state.termMonths,
            message: state.message);
        if (!_disposed) state = state.copy(applicationId: id, step: ApplicationStep.submitted);
      });
  Future<void> _run(Future<void> Function() action) async {
    if (_disposed || state.busy || state.loading) return;
    state = state.copy(busy: true, restoreFailed: false);
    try {
      await action();
    } on ApiException catch (e) {
      if (!_disposed) state = state.copy(error: e.message);
    } catch (_) {
      if (!_disposed) state = state.copy(error: 'Could not complete this step. Please try again.');
    } finally {
      if (!_disposed) {
        state = state.copy(busy: false, error: state.error);
        _schedule();
      }
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _poll?.cancel();
    super.dispose();
  }
}

final applicationFlowProvider = StateNotifierProvider.autoDispose
    .family<ApplicationFlowController, ApplicationFlowState, String>((ref, resourceId) {
  ref.watch(sessionProvider);
  return ApplicationFlowController(ref.watch(verificationRepositoryProvider), ref.watch(applicationRepositoryProvider),
      resourceId, ref.watch(clockProvider));
});
