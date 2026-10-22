import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../design/tokens.dart';

enum ViewingGlyph {
  bath,
  bed,
  calendar,
  check,
  checkCircle,
  chevronDown,
  chevronLeft,
  chevronRight,
  close,
  house,
  info,
  location,
  message,
  moon,
  parking,
  pendingCircle,
  shieldCheck,
  sun,
  verified;

  static const String _root = 'assets/raw-file-property-inquire/westayplace-viewing-assets/icons/svg';

  String get asset => '$_root/${switch (this) {
        ViewingGlyph.checkCircle => 'check-circle',
        ViewingGlyph.chevronDown => 'chevron-down',
        ViewingGlyph.chevronLeft => 'chevron-left',
        ViewingGlyph.chevronRight => 'chevron-right',
        ViewingGlyph.pendingCircle => 'pending-circle',
        ViewingGlyph.shieldCheck => 'shield-check',
        _ => name,
      }}.svg';
}

class ViewingIcon extends StatelessWidget {
  const ViewingIcon(this.glyph, {this.size = 20, this.color = Tokens.primaryNavy, this.semanticLabel, super.key});

  final ViewingGlyph glyph;
  final double size;
  final Color? color;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final tint = color;
    return SvgPicture.asset(
      glyph.asset,
      width: size,
      height: size,
      colorFilter: tint == null ? null : ColorFilter.mode(tint, BlendMode.srcIn),
      semanticsLabel: semanticLabel,
      excludeFromSemantics: semanticLabel == null,
    );
  }
}
