import 'package:flutter/material.dart';
import 'application_styles.dart';
import 'verification_assets.dart';

class IdScanGuide extends StatelessWidget {
  const IdScanGuide({this.processing = false, super.key});
  final bool processing;
  @override
  Widget build(BuildContext context) => AspectRatio(
      aspectRatio: 194 / 130,
      child: Stack(fit: StackFit.expand, children: [
        const VerificationOverlay(asset: VerificationAssets.frontCorners),
        if (!processing)
          const Padding(
              padding: EdgeInsets.all(3),
              child: ColorFiltered(
                  colorFilter: ColorFilter.mode(ApplicationStyles.blue, BlendMode.srcIn),
                  child: VerificationOverlay(asset: VerificationAssets.frontCorners))),
        if (processing) const Center(child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3)),
      ]));
}
