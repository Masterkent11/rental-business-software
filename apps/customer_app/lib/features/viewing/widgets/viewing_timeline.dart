import 'package:flutter/material.dart';

import '../../../data/viewing_repository.dart';
import '../../../design/motion.dart';
import '../../../design/tokens.dart';
import 'viewing_icon.dart';

class ViewingTimeline extends StatelessWidget {
  const ViewingTimeline({required this.viewing, required this.now, super.key});

  final ViewingView viewing;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final status = viewing.status;
    final confirmed = viewing.isConfirmed;
    final secondLabel = switch (status) {
      ViewingStatus.matching => 'Finding a specialist',
      ViewingStatus.rescheduleRequested => 'Agent suggested another time',
      ViewingStatus.declined => 'No specialist available for that time',
      ViewingStatus.cancelled => 'Request cancelled',
      _ => 'Agent confirming',
    };
    final secondDone = confirmed || status == ViewingStatus.rescheduleRequested;
    final confirmedDetail = [viewing.confirmedDayLabel, viewing.confirmedTimeLabel].whereType<String>().join(' · ');
    final steps = [
      _Step('Request sent', viewing.requestedAtLabel(now), done: true, current: false),
      _Step(
        secondLabel,
        !secondDone && viewing.isActive ? 'We\u2019ll notify you once confirmed.' : null,
        done: secondDone,
        current: !secondDone && viewing.isActive,
      ),
      _Step(
        'Viewing confirmed',
        confirmed && confirmedDetail.isNotEmpty ? confirmedDetail : null,
        done: confirmed,
        current: false,
        success: true,
      ),
    ];
    return Column(
      children: [
        for (var index = 0; index < steps.length; index++)
          _TimelineRow(step: steps[index], last: index == steps.length - 1),
      ],
    );
  }
}

class _Step {
  const _Step(this.title, this.detail, {required this.done, required this.current, this.success = false});

  final String title;
  final String? detail;
  final bool done;
  final bool current;
  final bool success;
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({required this.step, required this.last});

  final _Step step;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final duration = Motion.of(context, Motion.state);
    final doneColor = step.success ? Tokens.available : Tokens.primaryNavy;
    final Widget marker = step.done
        ? Container(
            key: const ValueKey('done'),
            width: 20,
            height: 20,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: doneColor, shape: BoxShape.circle),
            child: const ViewingIcon(ViewingGlyph.check, size: 12, color: Colors.white),
          )
        : Container(
            key: const ValueKey('pending'),
            width: 20,
            height: 20,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: step.current ? Tokens.primaryNavy : Tokens.hairline,
                width: 1.6,
              ),
            ),
          );
    final status = step.done ? ', done' : (step.current ? ', in progress' : ', not yet');
    return Semantics(
      label: '${step.title}$status${step.detail == null ? '' : ', ${step.detail}'}',
      excludeSemantics: true,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: 20,
              child: Column(
                children: [
                  SizedBox.square(
                    dimension: 20,
                    child: AnimatedSwitcher(
                      duration: duration,
                      switchInCurve: Motion.enter,
                      switchOutCurve: Motion.swap,
                      child: marker,
                    ),
                  ),
                  if (!last)
                    Expanded(
                      child: AnimatedContainer(
                        duration: duration,
                        curve: Motion.enter,
                        width: 1.5,
                        margin: const EdgeInsets.symmetric(vertical: Tokens.s2),
                        color: step.done ? Tokens.primaryNavy.withValues(alpha: 0.35) : Tokens.hairline,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: Tokens.s12),
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(bottom: last ? 0 : Tokens.s12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AnimatedDefaultTextStyle(
                      duration: duration,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.4,
                        fontWeight: FontWeight.w600,
                        color: step.done || step.current ? Tokens.primaryNavy : Tokens.muted,
                      ),
                      child: Text(step.title),
                    ),
                    if (step.detail != null && step.detail!.isNotEmpty) ...[
                      const SizedBox(height: Tokens.s2),
                      Text(step.detail!, style: const TextStyle(fontSize: 12.5, color: Tokens.muted)),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
