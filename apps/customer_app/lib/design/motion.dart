import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'tokens.dart';

class Reveal extends StatefulWidget {
  const Reveal({
    required this.child,
    this.order = 0,
    this.from = 14,
    super.key,
  });

  final Widget child;
  final int order;

  final double from;

  @override
  State<Reveal> createState() => _RevealState();
}

class _RevealState extends State<Reveal> with SingleTickerProviderStateMixin {
  late final Duration _delay = Duration(
    milliseconds: (widget.order * 70).clamp(0, 420),
  );

  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: _delay + Tokens.reveal,
  )..forward();

  late final Animation<double> _progress = CurvedAnimation(
    parent: _controller,
    curve: Interval(
      _delay.inMilliseconds / (_delay + Tokens.reveal).inMilliseconds,
      1,
      curve: Tokens.ease,
    ),
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _progress,
      builder: (context, child) => Opacity(
        opacity: _progress.value,
        child: Transform.translate(
          offset: Offset(0, widget.from * (1 - _progress.value)),
          child: child,
        ),
      ),
      child: widget.child,
    );
  }
}

class Squeeze extends StatefulWidget {
  const Squeeze({
    required this.child,
    required this.onTap,
    this.scale = 0.975,
    this.haptic = true,
    super.key,
  });

  final Widget child;
  final VoidCallback onTap;
  final double scale;
  final bool haptic;

  @override
  State<Squeeze> createState() => _SqueezeState();
}

class _SqueezeState extends State<Squeeze> {
  bool _held = false;

  void _set(bool held) {
    if (_held != held && mounted) setState(() => _held = held);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => _set(true),
      onTapCancel: () => _set(false),
      onTapUp: (_) => _set(false),
      onTap: () {
        if (widget.haptic) HapticFeedback.selectionClick();
        widget.onTap();
      },
      child: AnimatedScale(
        scale: _held ? widget.scale : 1,
        duration: Tokens.quick,
        curve: Tokens.ease,
        child: widget.child,
      ),
    );
  }
}

class RiseTransitionsBuilder extends PageTransitionsBuilder {
  const RiseTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final curved = CurvedAnimation(
      parent: animation,
      curve: Tokens.emphasised,
      reverseCurve: Curves.easeInCubic,
    );

    return FadeTransition(
      opacity: curved,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0, 0.035),
          end: Offset.zero,
        ).animate(curved),
        child: child,
      ),
    );
  }
}
