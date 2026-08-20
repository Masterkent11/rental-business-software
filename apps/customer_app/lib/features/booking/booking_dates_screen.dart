import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../../design/money.dart';
import '../../design/tokens.dart';
import '../../fixtures/sample_data.dart';

/// Short-term: pick dates, see the total, then pay.
///
/// Two things the journey insists on, both visible here:
///
///   * **Honest availability.** A night shown as open must be bookable. The
///     blocked nights come from the server's projection of one occupancy
///     timeline — this screen renders them and derives nothing.
///   * **Total cost before committing.** Payment *is* the commitment on this
///     path; there is no approval step to change your mind during.
class BookingDatesScreen extends StatefulWidget {
  const BookingDatesScreen({required this.listingId, super.key});

  final String listingId;

  @override
  State<BookingDatesScreen> createState() => _BookingDatesScreenState();
}

class _BookingDatesScreenState extends State<BookingDatesScreen> {
  DateTime? _checkIn;
  DateTime? _checkOut;

  int get _nights => (_checkIn != null && _checkOut != null)
      ? _checkOut!.difference(_checkIn!).inDays
      : 0;

  @override
  Widget build(BuildContext context) {
    final detail = SampleData.detailById(widget.listingId);
    if (detail == null) return const Scaffold();

    final theme = Theme.of(context);
    final card = detail.card;
    final minStay = detail.minimumStayNights ?? 1;
    final today = DateTime.now();
    final months = [
      DateTime(today.year, today.month),
      DateTime(today.year, today.month + 1),
      DateTime(today.year, today.month + 2),
    ];

    final tooShort = _nights > 0 && _nights < minStay;
    final canBook = _nights >= minStay;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Select dates'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: ListView(
        physics: Tokens.scroll,
        padding: const EdgeInsets.fromLTRB(
          Tokens.gutter,
          0,
          Tokens.gutter,
          Tokens.s40,
        ),
        children: [
          Text(card.title, style: theme.textTheme.titleMedium),
          Text(
            '${Money.perNight(card.priceCentavos)} · minimum $minStay nights',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: Tokens.s20),
          const _Legend(),
          const SizedBox(height: Tokens.s16),
          for (final month in months)
            _MonthGrid(
              month: month,
              checkIn: _checkIn,
              checkOut: _checkOut,
              isBlocked: (day) => _isBlocked(day, detail.blockedRanges),
              onTap: (day) => _select(day, detail.blockedRanges),
            ),
          if (tooShort)
            Padding(
              padding: const EdgeInsets.only(top: Tokens.s16),
              child: Text(
                'This owner asks for at least $minStay nights.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: _BookingBar(
        nights: _nights,
        nightlyCentavos: card.priceCentavos,
        checkIn: _checkIn,
        checkOut: _checkOut,
        enabled: canBook,
        onBook: () => ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment needs the API contracts from Step 5.'),
          ),
        ),
      ),
    );
  }

  /// Half-open, exactly like the domain: `[from, to)`. A guest checking out on
  /// the 29th frees the 29th.
  bool _isBlocked(
    DateTime day,
    List<({DateTime from, DateTime to})> ranges,
  ) {
    for (final range in ranges) {
      if (!day.isBefore(range.from) && day.isBefore(range.to)) return true;
    }
    return false;
  }

  void _select(DateTime day, List<({DateTime from, DateTime to})> ranges) {
    HapticFeedback.selectionClick();

    setState(() {
      if (_checkIn == null || _checkOut != null || !day.isAfter(_checkIn!)) {
        _checkIn = day;
        _checkOut = null;
        return;
      }

      // A range may not swallow a blocked night. Refusing here is the client
      // being polite; the server refuses for real, because that is where the
      // timeline lives.
      for (var d = _checkIn!;
          d.isBefore(day);
          d = d.add(const Duration(days: 1))) {
        if (_isBlocked(d, ranges)) {
          _checkIn = day;
          _checkOut = null;
          return;
        }
      }
      _checkOut = day;
    });
  }
}

class _Legend extends StatelessWidget {
  const _Legend();

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
  });

  final DateTime month;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final bool Function(DateTime) isBlocked;
  final ValueChanged<DateTime> onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final first = DateTime(month.year, month.month, 1);
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final leading = first.weekday % 7; // Sunday-first, as PH calendars read.
    final today = DateUtils.dateOnly(DateTime.now());

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

class _BookingBar extends StatelessWidget {
  const _BookingBar({
    required this.nights,
    required this.nightlyCentavos,
    required this.checkIn,
    required this.checkOut,
    required this.enabled,
    required this.onBook,
  });

  final int nights;
  final int nightlyCentavos;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final bool enabled;
  final VoidCallback onBook;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final format = DateFormat('MMM d');
    final total = nights * nightlyCentavos;

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(color: theme.colorScheme.outlineVariant),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(Tokens.gutter),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (nights > 0) ...[
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${format.format(checkIn!)} – ${format.format(checkOut!)}'
                        ' · $nights ${nights == 1 ? "night" : "nights"}',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                    Text(
                      '$nights × ${Money.peso(nightlyCentavos)}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
                const SizedBox(height: Tokens.s8),
                Row(
                  children: [
                    Text('Total', style: theme.textTheme.titleMedium),
                    const Spacer(),
                    Text(
                      Money.peso(total),
                      style: theme.textTheme.headlineSmall,
                    ),
                  ],
                ),
                const SizedBox(height: Tokens.s12),
              ] else
                Padding(
                  padding: const EdgeInsets.only(bottom: Tokens.s12),
                  child: Text(
                    'Pick a check-in and check-out date',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              FilledButton(
                onPressed: enabled ? onBook : null,
                child: const Text('Book and pay in full'),
              ),
              const SizedBox(height: Tokens.s8),
              Text(
                'Payment confirms the booking. There is no approval step.',
                style: theme.textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
