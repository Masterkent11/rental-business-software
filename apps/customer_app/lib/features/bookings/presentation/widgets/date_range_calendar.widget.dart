import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/design/tokens.dart';

class DateRangeCalendar extends StatefulWidget {
  const DateRangeCalendar({
    required this.onRangeSelected,
    this.initialRange,
    this.blockedRanges = const [],
    this.minimumStayNights,
    super.key,
  });

  final void Function(DateTime from, DateTime to) onRangeSelected;
  final ({DateTime from, DateTime to})? initialRange;
  final List<({DateTime from, DateTime to})> blockedRanges;
  final int? minimumStayNights;

  @override
  State<DateRangeCalendar> createState() => _DateRangeCalendarState();
}

class _DateRangeCalendarState extends State<DateRangeCalendar> {
  DateTime? _start;
  DateTime? _end;

  @override
  void initState() {
    super.initState();
    _start = widget.initialRange?.from;
    _end = widget.initialRange?.to;
  }

  bool _isBlocked(DateTime date) {
    for (final b in widget.blockedRanges) {
      if (!date.isBefore(b.from) && date.isBefore(b.to)) return true;
    }
    return false;
  }

  void _onDaySelected(DateTime date) {
    if (_isBlocked(date)) return;

    if (_start == null || (_start != null && _end != null)) {
      setState(() {
        _start = date;
        _end = null;
      });
    } else if (_start != null && _end == null) {
      if (date.isBefore(_start!)) {
        setState(() => _start = date);
      } else {
        final diff = date.difference(_start!).inDays;
        if (widget.minimumStayNights != null && diff < widget.minimumStayNights!) {
          return;
        }
        setState(() => _end = date);
        widget.onRangeSelected(_start!, date);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    return Column(
      children: [
        _MonthGrid(
          month: DateTime(now.year, now.month),
          start: _start,
          end: _end,
          isBlocked: _isBlocked,
          onDaySelected: _onDaySelected,
        ),
      ],
    );
  }
}

class _MonthGrid extends StatelessWidget {
  const _MonthGrid({
    required this.month,
    required this.start,
    required this.end,
    required this.isBlocked,
    required this.onDaySelected,
  });

  final DateTime month;
  final DateTime? start;
  final DateTime? end;
  final bool Function(DateTime) isBlocked;
  final void Function(DateTime) onDaySelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final monthFmt = DateFormat('MMMM yyyy');
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final firstWeekday = DateTime(month.year, month.month, 1).weekday;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(monthFmt.format(month), style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: Tokens.s12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 7,
            mainAxisSpacing: 4,
            crossAxisSpacing: 4,
          ),
          itemCount: daysInMonth + (firstWeekday % 7),
          itemBuilder: (context, index) {
            if (index < (firstWeekday % 7)) return const SizedBox();
            final day = index - (firstWeekday % 7) + 1;
            final date = DateTime(month.year, month.month, day);
            final blocked = isBlocked(date);
            final isStart = start != null && _isSameDay(start!, date);
            final isEnd = end != null && _isSameDay(end!, date);
            final inRange = start != null && end != null && date.isAfter(start!) && date.isBefore(end!);

            Color? bg;
            Color fg = Tokens.ink;
            if (blocked) {
              fg = Tokens.inkSubtle;
            } else if (isStart || isEnd) {
              bg = Tokens.ink;
              fg = Tokens.surface;
            } else if (inRange) {
              bg = Tokens.surfaceSubtle;
            }

            return InkWell(
              onTap: blocked ? null : () => onDaySelected(date),
              borderRadius: Tokens.borderSm,
              child: Container(
                decoration: BoxDecoration(
                  color: bg,
                  borderRadius: Tokens.borderSm,
                ),
                child: Center(
                  child: Text(
                    '$day',
                    style: TextStyle(
                      color: fg,
                      fontWeight: isStart || isEnd ? FontWeight.bold : FontWeight.normal,
                      decoration: blocked ? TextDecoration.lineThrough : null,
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}
