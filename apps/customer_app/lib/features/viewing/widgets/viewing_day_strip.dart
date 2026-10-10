import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../../../design/motion.dart';
import '../../../design/tokens.dart';
import 'viewing_icon.dart';

class ViewingDayStrip extends StatefulWidget {
  const ViewingDayStrip({required this.days, required this.selected, required this.onSelect, super.key});

  final List<DateTime> days;
  final DateTime? selected;
  final ValueChanged<DateTime> onSelect;

  @override
  State<ViewingDayStrip> createState() => _ViewingDayStripState();
}

class _ViewingDayStripState extends State<ViewingDayStrip> {
  late DateTime _week = _weekOf(widget.selected ?? widget.days.first);
  int _direction = 1;

  static DateTime _weekOf(DateTime day) => DateTime.utc(day.year, day.month, day.day - day.weekday % 7);

  DateTime get _firstWeek => _weekOf(widget.days.first);

  DateTime get _lastWeek => _weekOf(widget.days.last);

  bool get _canBack => _week.isAfter(_firstWeek);

  bool get _canForward => _week.isBefore(_lastWeek);

  void _page(int weeks) {
    HapticFeedback.selectionClick();
    setState(() {
      _direction = weeks.sign;
      _week = DateTime.utc(_week.year, _week.month, _week.day + weeks * 7);
    });
  }

  @override
  Widget build(BuildContext context) {
    final week = [for (var i = 0; i < 7; i++) DateTime.utc(_week.year, _week.month, _week.day + i)];
    final anchor = week.firstWhere(widget.days.contains, orElse: () => week.first);
    final duration = Motion.of(context, Motion.selection);
    return Column(
      children: [
        Row(
          children: [
            _Arrow(
              glyph: ViewingGlyph.chevronLeft,
              label: 'Previous week',
              onTap: _canBack ? () => _page(-1) : null,
            ),
            Expanded(
              child: AnimatedSwitcher(
                duration: duration,
                child: Text(
                  DateFormat('MMMM yyyy').format(anchor),
                  key: ValueKey(DateFormat('yyyy-MM').format(anchor)),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: Tokens.primaryNavy),
                ),
              ),
            ),
            _Arrow(
              glyph: ViewingGlyph.chevronRight,
              label: 'Next week',
              onTap: _canForward ? () => _page(1) : null,
            ),
          ],
        ),
        const SizedBox(height: Tokens.s8),
        AnimatedSwitcher(
          duration: Motion.of(context, const Duration(milliseconds: 220)),
          switchInCurve: Motion.enter,
          switchOutCurve: Motion.swap,
          transitionBuilder: (child, animation) {
            final incoming = child.key == ValueKey(_week);
            final offset = Tween<Offset>(
              begin: Offset((incoming ? 0.08 : -0.08) * _direction, 0),
              end: Offset.zero,
            ).animate(animation);
            return FadeTransition(opacity: animation, child: SlideTransition(position: offset, child: child));
          },
          child: Row(
            key: ValueKey(_week),
            children: [
              for (final day in week)
                Expanded(
                  child: _DayCell(
                    day: day,
                    enabled: widget.days.contains(day),
                    selected: day == widget.selected,
                    onTap: () {
                      HapticFeedback.selectionClick();
                      widget.onSelect(day);
                    },
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Arrow extends StatelessWidget {
  const _Arrow({required this.glyph, required this.label, required this.onTap});

  final ViewingGlyph glyph;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: onTap != null,
      label: label,
      excludeSemantics: true,
      child: InkResponse(
        onTap: onTap,
        radius: Tokens.tap / 2,
        child: SizedBox.square(
          dimension: Tokens.tap,
          child: Center(
            child: ViewingIcon(
              glyph,
              size: 18,
              color: onTap == null ? Tokens.hairline : Tokens.primaryNavy,
            ),
          ),
        ),
      ),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({required this.day, required this.enabled, required this.selected, required this.onTap});

  final DateTime day;
  final bool enabled;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final duration = Motion.of(context, Motion.selection);
    final numberColor = selected
        ? Colors.white
        : enabled
            ? Tokens.primaryNavy
            : Tokens.muted.withValues(alpha: 0.45);
    return Semantics(
      button: true,
      enabled: enabled,
      selected: selected,
      label: '${DateFormat('EEEE, MMMM d').format(day)}${enabled ? '' : ', unavailable'}',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: enabled ? onTap : null,
        child: Column(
          children: [
            Text(
              DateFormat('EEE').format(day),
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                color: selected ? Tokens.primaryNavy : Tokens.muted,
              ),
            ),
            const SizedBox(height: Tokens.s6),
            AnimatedContainer(
              duration: duration,
              curve: Motion.enter,
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: selected ? Tokens.primaryNavy : (enabled ? Tokens.card : Colors.transparent),
                borderRadius: BorderRadius.circular(Tokens.rSm),
                border: Border.all(color: selected ? Tokens.primaryNavy : (enabled ? Tokens.hairline : Colors.transparent)),
              ),
              child: AnimatedDefaultTextStyle(
                duration: duration,
                curve: Motion.enter,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: numberColor,
                ),
                child: Text(DateFormat('d').format(day)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
