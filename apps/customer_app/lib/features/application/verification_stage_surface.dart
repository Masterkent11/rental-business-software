import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'application_styles.dart';

class VerificationStageSurface extends StatelessWidget {
  const VerificationStageSurface(
      {required this.title,
      required this.background,
      required this.onBack,
      this.subtitle,
      this.guide,
      this.footer,
      this.blur = false,
      this.error,
      super.key});
  final String title;
  final String? subtitle;
  final Widget background;
  final Widget? guide;
  final Widget? footer;
  final VoidCallback? onBack;
  final bool blur;
  final String? error;

  @override
  Widget build(BuildContext context) => AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Stack(fit: StackFit.expand, children: [
        if (blur)
          ImageFiltered(imageFilter: ImageFilter.blur(sigmaX: 14, sigmaY: 14), child: background)
        else
          background,
        const ColoredBox(color: Color(0x40000000)),
        if (guide != null) guide!,
        SafeArea(
            bottom: false,
            child: Column(children: [
              Align(
                  alignment: Alignment.centerLeft,
                  child: IconButton(
                      tooltip: 'Back',
                      onPressed: onBack,
                      color: Colors.white,
                      icon: const Icon(Icons.arrow_back, size: 22))),
              Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Text(title,
                      style: ApplicationStyles.heading.copyWith(color: Colors.white), textAlign: TextAlign.center)),
              if (subtitle != null) ...[
                const SizedBox(height: 10),
                Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 40),
                    child: Text(subtitle!,
                        style: const TextStyle(fontSize: 14, height: 1.4, color: Colors.white),
                        textAlign: TextAlign.center)),
              ],
            ])),
        if (footer != null) Align(alignment: Alignment.bottomCenter, child: footer!),
        if (error != null)
          SafeArea(
              child: Align(
                  alignment: Alignment.topCenter,
                  child: Padding(
                      padding: const EdgeInsets.only(top: 146, left: 20, right: 20),
                      child: Semantics(
                          liveRegion: true,
                          child: Text(error!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.white, fontSize: 13)))))),
      ]));
}

class VerificationStageProgress extends StatelessWidget {
  const VerificationStageProgress({this.value, this.label, super.key});
  final double? value;
  final String? label;
  @override
  Widget build(BuildContext context) => SafeArea(
      top: false,
      child: Padding(
          padding: const EdgeInsets.fromLTRB(48, 20, 48, 24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            SizedBox(
                width: 260,
                child: LinearProgressIndicator(
                    value: value,
                    minHeight: 7,
                    color: ApplicationStyles.blue,
                    backgroundColor: const Color(0x66FFFFFF),
                    borderRadius: BorderRadius.circular(8),
                    semanticsLabel: label)),
            if (label != null) ...[
              const SizedBox(height: 16),
              Text(label!, style: const TextStyle(fontSize: 14, color: Colors.white), textAlign: TextAlign.center)
            ],
          ])));
}
