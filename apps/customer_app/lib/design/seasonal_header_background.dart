import 'package:flutter/material.dart';

import 'home_assets.dart';

class SeasonalHeaderBackground extends StatelessWidget {
  const SeasonalHeaderBackground({
    super.key,
    this.visible = true,
  });

  final bool visible;

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.of(context).disableAnimations;
    final animated = visible && !reduced && TickerMode.valuesOf(context).enabled;
    return ExcludeSemantics(
      child: IgnorePointer(
        child: Image.asset(
          animated ? HomeAssets.winterSnow : HomeAssets.winterSnowStill,
          key: ValueKey(animated),
          width: double.infinity,
          height: double.infinity,
          fit: BoxFit.cover,
          gaplessPlayback: false,
        ),
      ),
    );
  }
}
