import 'package:flutter/material.dart';

/// Decorative background only. Render controls ABOVE it in a Stack.
/// Pass visible:false when scrolled away or the route/app is inactive.
class WinterHeaderBackground extends StatelessWidget {
  const WinterHeaderBackground({super.key, this.visible = true});
  final bool visible;
  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.of(context).disableAnimations;
    final animated = visible && !reduced && TickerMode.of(context);
    return ExcludeSemantics(child: IgnorePointer(child: Image.asset(
      animated ? 'assets/westayplace/animations/winter-snow.gif'
        : 'assets/westayplace/backgrounds/winter-header-960.png',
      key: ValueKey(animated), width: double.infinity, height: double.infinity,
      fit: BoxFit.cover, gaplessPlayback: false,
    )));
  }
}
