import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design/tokens.dart';

/// A two-ended date range picker over a run of months.
///
/// Extracted from the short-term booking screen so search can use the same
/// widget. There is exactly one date-selection implementation in this app, and
/// this is it — a second one would drift, and the half-open interval convention
/// is precisely the kind of detail that drifts.
///
/// It knows nothing about availability. The booking screen passes an
/// [isBlocked] callback built from the server's projection; search passes none,
/// because "which nights are open" is a question about one resource and search
/// has not chosen one yet.
class DateRangeCalendar extends StatelessWidget {
  const DateRangeCalendar({
    required this.months,
    required this.start,
    required this.end,
    required this.onTap,
    this.isBlocked,
    this.firstSelectable,
    super.key,
  });

  final int months;
  final DateTime? start;
  final DateTime? end;
  final ValueChanged<DateTime> onTap;
  final bool Function(DateTime)? isBlocked;
  final DateTime? firstSelectable;

  /// Half-open, exactly like the domain: `[from, to)`. A checkout on the 29th
  /// frees the 29th.
  static bool isWithin(
    DateTime day,
    List<({DateTime from, DateTime to})> ranges,
  ) {
    for (final range in ranges) {
      if (!day.isBefore(range.from) && day.isBefore(range.to)) return true;
    }
    return false;
  }

  /// Two-ended selection, shared by every caller.
  ///
  /// Tapping a day that is not after the current start restarts the range,
  /// which is how a picker refuses an end before its beginning without ever
  /// showing an error.
  static (DateTime?, DateTime?) select({
    required DateTime day,
    required DateTime? start,
    required DateTime? end,
    bool Function(DateTime)? isBlocked,
  }) {
    if (start == null || end != null || !day.isAfter(start)) {
      return (day, null);
    }
    if (isBlocked != null) {
      for (var d = start; d.isBefore(day); d = d.add(const Duration(days: 1))) {
        if (isBlocked(d)) return (day, null);
      }
    }
    return (start, day);
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    return Column(
      children: [
        for (var i = 0; i < months; i++)
          _MonthGrid(
            month: DateTime(now.year, now.month + i),
            checkIn: start,
            checkOut: end,
            isBlocked: isBlocked ?? (_) => false,
            firstSelectable: firstSelectable,
            onTap: onTap,
          ),
      ],
    );
  }
}

class DateRangeLegend extends StatelessWidget {
  const DateRangeLegend({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        _dot(theme.colorScheme.primary, 'Your stay', context),
        const SizedBox(width: Tokens.s16),
        _dot(theme.colorScheme.outlineVariant, 'Taken', context),
      ],
    );
  }

  Widget _dot(Color color, String label, BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: Tokens.s6),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      );
}

class _MonthGrid extends StatelessWidget {
  const _MonthGrid({
    required this.month,
    required this.checkIn,
    required this.checkOut,
    required this.isBlocked,
    required this.onTap,
    this.firstSelectable,
  });

  final DateTime month;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final bool Function(DateTime) isBlocked;
  final ValueChanged<DateTime> onTap;
  final DateTime? firstSelectable;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final first = DateTime(month.year, month.month, 1);
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final leading = first.weekday % 7; // Sunday-first, as PH calendars read.
    final today = DateUtils.dateOnly(firstSelectable ?? DateTime.now());

    return Padding(
      padding: const EdgeInsets.only(bottom: Tokens.s24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            DateFormat('MMMM yyyy').format(month),
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: Tokens.s12),
          Row(
            children: [
              for (final d in ['S', 'M', 'T', 'W', 'T', 'F', 'S'])
                Expanded(
                  child: Center(
                    child: Text(d, style: theme.textTheme.labelSmall),
                  ),
                ),
            ],
          ),
          const SizedBox(height: Tokens.s8),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              childAspectRatio: 1,
            ),
            itemCount: leading + daysInMonth,
            itemBuilder: (context, i) {
              if (i < leading) return const SizedBox.shrink();

              final day = DateTime(month.year, month.month, i - leading + 1);
              final past = day.isBefore(today);
              final blocked = isBlocked(day);
              final isStart = checkIn != null && day == checkIn;
              final isEnd = checkOut != null && day == checkOut;
              final inRange = checkIn != null &&
                  checkOut != null &&
                  day.isAfter(checkIn!) &&
                  day.isBefore(checkOut!);

              return _DayCell(
                day: day,
                disabled: past || blocked,
                blocked: blocked && !past,
                selected: isStart || isEnd,
                inRange: inRange,
                onTap: past || blocked ? null : () => onTap(day),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.disabled,
    required this.blocked,
    required this.selected,
    required this.inRange,
    required this.onTap,
  });

  final DateTime day;
  final bool disabled;
  final bool blocked;
  final bool selected;
  final bool inRange;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Color? background;
    Color foreground = theme.colorScheme.onSurface;

    if (selected) {
      background = theme.colorScheme.primary;
      foreground = theme.colorScheme.onPrimary;
    } else if (inRange) {
      background = theme.colorScheme.primary.withOpacity(0.10);
    } else if (disabled) {
      foreground = theme.colorScheme.onSurfaceVariant.withOpacity(0.45);
    }

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Center(
        child: Container(
          width: 38,
          height: 38,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(selected ? 12 : 10),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Text(
                '${day.day}',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: foreground,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                ),
              ),
              if (blocked)
                Container(
                  width: 22,
                  height: 1.4,
                  color: theme.colorScheme.onSurfaceVariant.withOpacity(0.55),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
