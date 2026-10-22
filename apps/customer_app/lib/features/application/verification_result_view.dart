import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'verification_assets.dart';
import 'verification_stage_surface.dart';
import 'verification_processing_sheet.dart';
import 'id_scan_guide.dart';

class VerificationResultView extends StatefulWidget {
  const VerificationResultView(
      {required this.verified,
      required this.onBack,
      required this.onRefresh,
      this.onComplete,
      this.image,
      this.error,
      this.processingId = false,
      super.key});
  final bool verified;
  final bool processingId;
  final Uint8List? image;
  final String? error;
  final VoidCallback onBack;
  final VoidCallback onRefresh;
  final VoidCallback? onComplete;
  @override
  State<VerificationResultView> createState() => _VerificationResultViewState();
}

class _VerificationResultViewState extends State<VerificationResultView> with SingleTickerProviderStateMixin {
  late final AnimationController _appearance =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))
        ..addStatusListener((status) {
          if (status == AnimationStatus.completed && widget.verified) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted && widget.verified) widget.onComplete?.call();
            });
          }
        });
  bool _started = false;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _start();
  }

  @override
  void didUpdateWidget(covariant VerificationResultView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!oldWidget.verified && widget.verified) _start();
  }

  void _start() {
    if (!widget.verified || _started) return;
    _started = true;
    if (MediaQuery.disableAnimationsOf(context)) {
      _appearance.value = 1;
    } else {
      _appearance.forward();
    }
  }

  @override
  void dispose() {
    if (widget.image != null) MemoryImage(widget.image!).evict();
    _appearance.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
      builder: (context, size) => VerificationStageSurface(
            title: widget.verified
                ? 'Identity verified'
                : widget.processingId
                    ? 'Processing ID'
                    : 'Verifying your identity',
            subtitle: widget.processingId ? "We're extracting the information\nusing secure OCR" : null,
            background: widget.image == null
                ? const ColoredBox(color: Color(0xFF34312D))
                : Image.memory(widget.image!, fit: BoxFit.cover, gaplessPlayback: true),
            blur: true,
            onBack: widget.onBack,
            error: widget.error,
            guide: widget.verified
                ? Stack(children: [
                    Positioned(
                        top: size.maxHeight * .39,
                        left: 0,
                        right: 0,
                        height: 112,
                        child: FadeTransition(
                            opacity: _appearance,
                            child: VerificationOverlay(
                                asset: MediaQuery.disableAnimationsOf(context)
                                    ? VerificationAssets.successStill
                                    : VerificationAssets.success))),
                    Positioned(
                        top: size.maxHeight * .62,
                        left: 48,
                        right: 48,
                        child: const Text('Your identity has been verified\nsuccessfully.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 15, height: 1.45, color: Colors.white))),
                  ])
                : widget.processingId
                    ? Positioned(
                        top: size.maxHeight * .28, left: 24, right: 24, child: const IdScanGuide(processing: true))
                    : null,
            footer: widget.processingId
                ? Column(mainAxisSize: MainAxisSize.min, children: [
                    if (widget.error != null)
                      TextButton(
                          onPressed: widget.onRefresh,
                          child: const Text('Try again', style: TextStyle(color: Colors.white))),
                    const VerificationProcessingSheet(),
                  ])
                : Column(mainAxisSize: MainAxisSize.min, children: [
                    if (widget.error != null)
                      TextButton(
                          onPressed: widget.onRefresh,
                          child: const Text('Try again', style: TextStyle(color: Colors.white))),
                    VerificationStageProgress(
                        value: widget.verified ? 1 : null, label: widget.processingId ? 'Processing…' : null),
                  ]),
          ));
}
