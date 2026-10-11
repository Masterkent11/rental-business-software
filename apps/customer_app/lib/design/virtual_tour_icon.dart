import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'home_assets.dart';
import 'tokens.dart';

class VirtualTourIcon extends StatelessWidget {
  const VirtualTourIcon({
    super.key,
    this.size = 16,
    this.color,
  });

  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      HomeAssets.tour360Svg,
      width: size,
      height: size,
      fit: BoxFit.contain,
      excludeFromSemantics: true,
      colorFilter: ColorFilter.mode(
        color ?? Tokens.primaryNavy,
        BlendMode.srcIn,
      ),
    );
  }
}
