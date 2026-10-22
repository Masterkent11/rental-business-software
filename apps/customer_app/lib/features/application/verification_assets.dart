import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'domain/verification.dart';

abstract final class VerificationAssets {
  static const _root = 'assets/WeStayPlace_Verification_Assets';
  static const frontCorners = '$_root/svg/ocr/id_front_corner_brackets.svg';
  static const front = '$_root/gif/transparent_overlays/id_front_scan.gif';
  static const frontStill = '$_root/svg/ocr/id_front_frame.svg';
  static const processing = '$_root/gif/transparent_overlays/ocr_processing.gif';
  static const processingGlass = '$_root/svg/ocr/id_front_processing_glass.svg';
  static const face = '$_root/svg/facial/face_alignment_contour.svg';
  static const success = '$_root/gif/transparent_overlays/verification_success.gif';
  static const successStill = '$_root/svg/facial/verification_success_badge.svg';
  static String arrow(FaceInstruction cue, {required bool still}) => switch (cue) {
        FaceInstruction.right =>
          still ? '$_root/svg/facial/tilt_head_right_arrow.svg' : '$_root/gif/transparent_overlays/tilt_head_right.gif',
        FaceInstruction.left =>
          still ? '$_root/svg/facial/tilt_head_left_arrow.svg' : '$_root/gif/transparent_overlays/tilt_head_left.gif',
        FaceInstruction.up =>
          still ? '$_root/svg/facial/look_up_arrow.svg' : '$_root/gif/transparent_overlays/look_up.gif',
        FaceInstruction.align => face,
      };
}

class VerificationOverlay extends StatelessWidget {
  const VerificationOverlay({required this.asset, this.label, super.key});
  final String asset;
  final String? label;
  @override
  Widget build(BuildContext context) => ExcludeSemantics(
        child: asset.endsWith('.svg')
            ? SvgPicture.asset(asset, fit: BoxFit.contain)
            : Image.asset(asset, fit: BoxFit.contain, gaplessPlayback: true),
      );
}
