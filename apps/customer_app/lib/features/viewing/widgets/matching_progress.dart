import 'package:flutter/material.dart';

import '../../../design/motion.dart';
import '../../../design/tokens.dart';
import '../request_viewing_controller.dart';
import 'viewing_animation.dart';
import 'viewing_icon.dart';

class MatchingProgress extends StatelessWidget {
  const MatchingProgress({required this.state, super.key});

  final RequestViewingState state;

  static const Map<MatchingStep, String> labels = {
    MatchingStep.submitting: 'Submitting your request',
    MatchingStep.checkingAvailability: 'Checking agent availability',
    MatchingStep.assigningSpecialist: 'Assigning your property specialist',
  };

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final step in MatchingStep.values) _StepRow(label: labels[step]!, state: state.stepState(step)),
      ],
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({required this.label, required this.state});

  final String label;
  final MatchingStepState state;

  @override
  Widget build(BuildContext context) {
    final duration = Motion.of(context, Motion.matching);
    final indicator = switch (state) {
      MatchingStepState.done => Container(
          key: const ValueKey(MatchingStepState.done),
          width: 22,
          height: 22,
          alignment: Alignment.center,
          decoration: const BoxDecoration(color: Tokens.primaryNavy, shape: BoxShape.circle),
          child: const ViewingIcon(ViewingGlyph.check, size: 14, color: Colors.white),
        ),
      MatchingStepState.active => const ViewingAnimation(
          key: ValueKey(MatchingStepState.active),
          kind: ViewingMotion.spinner,
          size: 22,
        ),
      MatchingStepState.pending => const ViewingIcon(
          ViewingGlyph.pendingCircle,
          key: ValueKey(MatchingStepState.pending),
          size: 22,
          color: Tokens.hairline,
        ),
    };
    final status = switch (state) {
      MatchingStepState.done => 'done',
      MatchingStepState.active => 'in progress',
      MatchingStepState.pending => 'waiting',
    };
    return Semantics(
      label: '$label, $status',
      liveRegion: state == MatchingStepState.active,
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: Tokens.s8),
        child: Row(
          children: [
            SizedBox.square(
              dimension: 22,
              child: AnimatedSwitcher(
                duration: duration,
                switchInCurve: Motion.enter,
                switchOutCurve: Motion.swap,
                transitionBuilder: (child, animation) => FadeTransition(opacity: animation, child: child),
                child: indicator,
              ),
            ),
            const SizedBox(width: Tokens.s12),
            Expanded(
              child: _Pulse(
                active: state == MatchingStepState.active,
                child: AnimatedDefaultTextStyle(
                  duration: duration,
                  curve: Motion.enter,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: state == MatchingStepState.active ? FontWeight.w600 : FontWeight.w500,
                    color: state == MatchingStepState.pending ? Tokens.muted : Tokens.primaryNavy,
                  ),
                  child: Text(label),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Pulse extends StatefulWidget {
  const _Pulse({required this.active, required this.child});

  final bool active;
  final Widget child;

  @override
  State<_Pulse> createState() => _PulseState();
}

class _PulseState extends State<_Pulse> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1200), value: 1);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(covariant _Pulse oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active != widget.active) _sync();
  }

  void _sync() {
    if (widget.active && !Motion.reduced(context)) {
      _controller.repeat(reverse: true);
    } else {
      _controller
        ..stop()
        ..value = 1;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(
        opacity: Tween<double>(begin: 0.55, end: 1)
            .animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOutCubic)),
        child: widget.child,
      );
}
