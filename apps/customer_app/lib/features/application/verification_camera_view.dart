import 'dart:async';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../data/device_verification_camera.dart';
import 'domain/verification.dart';
import 'domain/verification_capture.dart';
import 'verification_assets.dart';
import 'verification_stage_surface.dart';
import 'application_styles.dart';
import 'verification_processing_sheet.dart';
import 'id_scan_guide.dart';

class VerificationCameraView extends StatefulWidget {
  const VerificationCameraView(
      {required this.busy, required this.onCapture, this.instruction, this.onBack, this.error, super.key});
  final bool busy;
  final FaceInstruction? instruction;
  final Future<void> Function(VerificationCapture) onCapture;
  final VoidCallback? onBack;
  final String? error;
  @override
  State<VerificationCameraView> createState() => _VerificationCameraViewState();
}

class _VerificationCameraViewState extends State<VerificationCameraView> with WidgetsBindingObserver {
  late DeviceVerificationCamera _camera;
  bool _capturing = false;
  bool _textExtracted = false;
  bool get _front => widget.instruction != null;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _camera = DeviceVerificationCamera(instruction: widget.instruction)
      ..addListener(_changed)
      ..onReady = _autoCapture;
    unawaited(_camera.open());
  }

  void _autoCapture() {
    if (mounted && !widget.busy && !_capturing) unawaited(_capture());
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  @override
  void didUpdateWidget(covariant VerificationCameraView oldWidget) {
    super.didUpdateWidget(oldWidget);
    _camera.updateInstruction(widget.instruction);
    if ((oldWidget.instruction != null) != _front) {
      _camera.removeListener(_changed);
      _camera.dispose();
      _camera = DeviceVerificationCamera(instruction: widget.instruction)
        ..addListener(_changed)
        ..onReady = _autoCapture;
      unawaited(_camera.open());
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_camera.open());
    } else {
      unawaited(_camera.close());
    }
  }

  Future<void> _capture() async {
    if (widget.busy || _capturing) return;
    setState(() {
      _capturing = true;
      _textExtracted = false;
    });
    try {
      final bytes = await _camera.capture();
      if (bytes != null && mounted) {
        setState(() => _textExtracted = true);
        await widget.onCapture(bytes);
      }
    } finally {
      if (mounted) setState(() => _capturing = false);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _camera.removeListener(_changed);
    _camera.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final camera = _camera.controller;
    final cue = widget.instruction;
    final processing = !_front && (_capturing || widget.busy);
    final initialized = camera?.value.isInitialized == true;
    final problem = _camera.error ?? widget.error;
    return LayoutBuilder(
        builder: (context, size) => VerificationStageSurface(
              title: processing ? 'Processing ID' : cue?.title ?? 'Scan your ID',
              subtitle: processing
                  ? "We're extracting the information\nusing secure OCR"
                  : switch (cue) {
                      FaceInstruction.align => 'Position your face in the oval',
                      FaceInstruction.right => 'Slowly tilt your head to the right',
                      FaceInstruction.left => 'Now tilt your head to the left',
                      FaceInstruction.up => 'Now look up',
                      null => 'Position the front of your\nvalid ID within the frame',
                    },
              onBack: widget.busy || _capturing ? null : widget.onBack,
              blur: processing,
              error: problem,
              background:
                  initialized ? _CameraPreviewSurface(camera: camera!) : const ColoredBox(color: Color(0xFF34312D)),
              guide: Stack(children: [
                if (!initialized && problem == null)
                  const Center(child: CircularProgressIndicator(color: Colors.white)),
                if (!_front)
                  Positioned(
                      top: size.maxHeight * .28, left: 24, right: 24, child: IdScanGuide(processing: processing)),
                if (cue == FaceInstruction.align)
                  Positioned(
                      top: size.maxHeight * .28,
                      left: size.maxWidth * .14,
                      width: size.maxWidth * .72,
                      child: const AspectRatio(
                          aspectRatio: 164 / 198, child: VerificationOverlay(asset: VerificationAssets.face))),
                if (cue != null && cue != FaceInstruction.align)
                  Positioned(
                      top: size.maxHeight * .24,
                      left: cue == FaceInstruction.left ? size.maxWidth * .08 : null,
                      right: cue == FaceInstruction.right ? size.maxWidth * .08 : null,
                      width: cue == FaceInstruction.up ? size.maxWidth : size.maxWidth * .40,
                      height: size.maxHeight * .13,
                      child: VerificationOverlay(
                          asset: VerificationAssets.arrow(cue, still: MediaQuery.disableAnimationsOf(context)))),
              ]),
              footer: problem != null
                  ? _CameraRecovery(
                      message: _camera.guidance,
                      onRetry: widget.busy ? null : () => _camera.open(),
                      onCapture: initialized && !widget.busy && !_capturing ? _capture : null)
                  : processing
                      ? VerificationProcessingSheet(textExtracted: _textExtracted)
                      : _front
                          ? Column(mainAxisSize: MainAxisSize.min, children: [
                              if (_camera.guidance.startsWith('Tap capture'))
                                TextButton(
                                    onPressed: !widget.busy && !_capturing ? _capture : null,
                                    child: const Text('Capture now', style: TextStyle(color: Colors.white))),
                            ])
                          : _IdCaptureInstructions(
                              onCapture: initialized && !widget.busy && !_capturing ? _capture : null),
            ));
  }
}

class _IdCaptureInstructions extends StatelessWidget {
  const _IdCaptureInstructions({required this.onCapture});
  final VoidCallback? onCapture;
  @override
  Widget build(BuildContext context) => Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
      decoration:
          const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
      child: SafeArea(
          top: false,
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('Capture the front of your ID', style: ApplicationStyles.label),
            const SizedBox(height: 16),
            for (final text in [
              'Place your original ID on a flat surface.',
              'Adjust the camera to align the ID within the frame.',
              "Hold steady. We'll capture automatically."
            ])
              Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Icon(Icons.check_circle, color: ApplicationStyles.blue, size: 22),
                    const SizedBox(width: 12),
                    Expanded(child: Text(text, style: ApplicationStyles.helper.copyWith(fontSize: 13, height: 1.4))),
                  ])),
            Center(
                child: Container(
                    width: 68,
                    height: 68,
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                        shape: BoxShape.circle, border: Border.all(color: ApplicationStyles.navy, width: 2)),
                    child: IconButton(
                        tooltip: 'Capture front of ID',
                        onPressed: onCapture,
                        style: IconButton.styleFrom(
                            backgroundColor: ApplicationStyles.navy,
                            foregroundColor: Colors.white,
                            disabledBackgroundColor: ApplicationStyles.pale,
                            shape: const CircleBorder(side: BorderSide(color: Colors.white, width: 1.5))),
                        icon: const Icon(Icons.camera_alt_outlined, size: 26)))),
          ])));
}

class _CameraRecovery extends StatelessWidget {
  const _CameraRecovery({required this.message, required this.onRetry, required this.onCapture});
  final String message;
  final VoidCallback? onRetry;
  final VoidCallback? onCapture;
  @override
  Widget build(BuildContext context) => SafeArea(
      top: false,
      child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(message, style: const TextStyle(color: Colors.white), textAlign: TextAlign.center),
            TextButton(
                onPressed: onRetry, child: const Text('Try camera again', style: TextStyle(color: Colors.white))),
            if (onCapture != null) FilledButton(onPressed: onCapture, child: const Text('Capture again')),
          ])));
}

class _CameraPreviewSurface extends StatelessWidget {
  const _CameraPreviewSurface({required this.camera});
  final CameraController camera;
  @override
  Widget build(BuildContext context) {
    final preview = camera.value.previewSize!;
    final orientation = camera.value.deviceOrientation;
    final portrait = orientation == DeviceOrientation.portraitUp || orientation == DeviceOrientation.portraitDown;
    return ClipRect(
        child: SizedBox.expand(
            child: FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                    width: portrait ? preview.height : preview.width,
                    height: portrait ? preview.width : preview.height,
                    child: CameraPreview(camera)))));
  }
}
