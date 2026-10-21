import 'package:flutter/material.dart';
import '../../design/tokens.dart';
import 'application_controller.dart';
import 'domain/verification.dart';
import 'identity_review_form.dart';
import 'verification_assets.dart';
import 'verification_camera_view.dart';
import 'verification_result_view.dart';

class VerificationPanel extends StatefulWidget {
  const VerificationPanel({required this.state, required this.controller, super.key});
  final ApplicationFlowState state;
  final ApplicationFlowController controller;
  @override
  State<VerificationPanel> createState() => _VerificationPanelState();
}

class _VerificationPanelState extends State<VerificationPanel> {
  bool _accepted = false;
  @override
  Widget build(BuildContext context) {
    final s = widget.state.session!;
    final c = widget.controller;
    final busy = widget.state.busy;
    return switch (s.status) {
      VerificationStatus.consentRequired => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Icon(Icons.verified_user_outlined, size: 56, color: Tokens.primaryBlue),
          const SizedBox(height: Tokens.s24),
          Text('Verify your identity', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: Tokens.s12),
          const Text(
              'We use your camera to read the front of your valid ID and capture your face for identity and liveness checks. Use a well-lit space and have your original ID ready.'),
          const SizedBox(height: Tokens.s12),
          const Text(
              'Your ID and facial evidence are private. Completing verification saves your progress; you decide when to submit your application to the owner.'),
          const SizedBox(height: Tokens.s12),
          CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: _accepted,
              onChanged: busy ? null : (value) => setState(() => _accepted = value ?? false),
              title: const Text('I consent to my ID and facial evidence being processed to verify my identity.')),
          FilledButton(onPressed: _accepted && !busy ? c.consent : null, child: const Text('Continue to camera')),
        ]),
      VerificationStatus.frontReady =>
        VerificationCameraView(busy: busy, onCapture: c.front, onBack: c.backToDetails, error: widget.state.error),
      VerificationStatus.ocrProcessing => VerificationResultView(
          verified: false,
          processingId: true,
          image: widget.state.documentPreview,
          error: widget.state.error,
          onBack: c.backToDetails,
          onRefresh: c.refresh),
      VerificationStatus.ocrReview => IdentityReviewForm(
          key: ValueKey(s.extracted?.toJson().toString()),
          session: s,
          busy: busy,
          onConfirm: c.confirm,
          onRecapture: c.restart,
          onBack: c.restart,
          preview: widget.state.documentPreview,
          error: widget.state.error),
      VerificationStatus.detailsConfirmed => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Get ready for a face check', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: Tokens.s16),
          const SizedBox(height: 220, child: VerificationOverlay(asset: VerificationAssets.face)),
          const SizedBox(height: Tokens.s16),
          const Text(
              'Use good lighting and remove anything covering your face. Follow each movement as it appears. The server checks the capture before your identity is verified.'),
          const SizedBox(height: Tokens.s24),
          FilledButton(onPressed: busy ? null : c.prepareChallenge, child: const Text('Retry face check')),
          TextButton(onPressed: busy ? null : c.restart, child: const Text('Scan ID again')),
        ]),
      VerificationStatus.challengeActive => VerificationCameraView(
          key: ValueKey(s.challengeId),
          onBack: c.backToDetails,
          error: widget.state.error,
          busy: busy,
          instruction: s.instruction ?? FaceInstruction.align,
          onCapture: c.face),
      VerificationStatus.verifying => VerificationResultView(
          verified: false,
          image: widget.state.facePreview,
          error: widget.state.error,
          onBack: c.backToDetails,
          onRefresh: c.refresh),
      VerificationStatus.manualReview => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Icon(Icons.pending_actions_outlined, size: 56, color: Tokens.primaryNavy),
          const SizedBox(height: Tokens.s24),
          Text('Identity pending review', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: Tokens.s12),
          const Text(
              'Your captures have been received. OCR and facial guidance do not confirm identity. A trusted review is still required.'),
          const SizedBox(height: Tokens.s24),
          if (c.canSubmitPending)
            FilledButton(onPressed: busy ? null : c.reviewPendingApplication, child: const Text('Review application')),
          TextButton(onPressed: busy ? null : c.refresh, child: const Text('Check review status')),
          TextButton(onPressed: busy ? null : c.restart, child: const Text('Retake captures')),
        ]),
      VerificationStatus.verified => VerificationResultView(
          verified: true,
          image: widget.state.facePreview,
          onBack: c.backToDetails,
          onRefresh: c.refresh,
          onComplete: c.finishVerificationPresentation),
      VerificationStatus.failed ||
      VerificationStatus.expired ||
      VerificationStatus.cancelled =>
        Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Icon(Icons.info_outline, size: 48, color: Tokens.primaryBlue),
          const SizedBox(height: Tokens.s16),
          Text(s.status == VerificationStatus.expired ? 'Verification expired' : 'Verification incomplete',
              style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: Tokens.s12),
          Text(s.failure ?? 'Start again when you are ready. Your application details are saved.'),
          const SizedBox(height: Tokens.s24),
          if (s.status != VerificationStatus.failed || s.retryable)
            FilledButton(onPressed: busy ? null : c.restart, child: const Text('Start again')),
          TextButton(onPressed: busy ? null : c.refresh, child: const Text('Check status')),
        ]),
    };
  }
}
