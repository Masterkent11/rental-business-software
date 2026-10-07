import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/router.dart';
import '../../data/availability_repository.dart';
import '../../data/listing_repository.dart';
import '../../design/money.dart';
import '../../design/tokens.dart';
import 'widgets/date_range_calendar.dart';

class BookingDatesScreen extends ConsumerStatefulWidget {
  const BookingDatesScreen({required this.listingId, super.key});

  final String listingId;

  @override
  ConsumerState<BookingDatesScreen> createState() => _BookingDatesScreenState();
}

class _BookingDatesScreenState extends ConsumerState<BookingDatesScreen> {
  DateTime? _checkIn;
  DateTime? _checkOut;

  int get _nights => (_checkIn != null && _checkOut != null)
      ? _checkOut!.difference(_checkIn!).inDays
      : 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final detailAsync = ref.watch(listingDetailProvider(widget.listingId));
    final detail = detailAsync.valueOrNull;

    if (detailAsync.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (detail == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Select dates')),
        body: const Center(child: Text('This place is no longer available.')),
      );
    }

    final card = detail.card;
    final minStay = detail.minimumStayNights ?? 1;
    final today = DateTime.now();

    final windowFrom = DateTime(today.year, today.month);
    final windowTo = DateTime(today.year, today.month + 3);
    final nightsAsync = card.resourceId.isEmpty
        ? const AsyncValue<List<NightView>>.data([])
        : ref.watch(
            availabilityProvider((
              resourceId: card.resourceId,
              from: windowFrom,
              to: windowTo,
            )),
          );

    final loaded = nightsAsync.hasValue;
    final blocked = <DateTime>{
      for (final night in nightsAsync.valueOrNull ?? const <NightView>[])
        if (night.status.isTaken)
          DateTime(night.night.year, night.night.month, night.night.day),
    };

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
          const DateRangeLegend(),
          const SizedBox(height: Tokens.s16),
          DateRangeCalendar(
            months: 3,
            start: _checkIn,
            end: _checkOut,
            isBlocked: (day) => _isBlocked(day, blocked, loaded),
            onTap: (day) => _select(day, blocked, loaded),
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
        onBook: () => context.push(
          Routes.checkout(
            listingId: widget.listingId,
            resourceId: card.resourceId,
            checkIn: _checkIn!,
            checkOut: _checkOut!,
          ),
        ),
      ),
    );
  }

  bool _isBlocked(DateTime day, Set<DateTime> blocked, bool loaded) {
    if (!loaded) return true;
    return blocked.contains(DateTime(day.year, day.month, day.day));
  }

  void _select(DateTime day, Set<DateTime> blocked, bool loaded) {
    HapticFeedback.selectionClick();

    setState(() {
      if (_checkIn == null || _checkOut != null || !day.isAfter(_checkIn!)) {
        _checkIn = day;
        _checkOut = null;
        return;
      }

      for (
        var d = _checkIn!;
        d.isBefore(day);
        d = d.add(const Duration(days: 1))
      ) {
        if (_isBlocked(d, blocked, loaded)) {
          _checkIn = day;
          _checkOut = null;
          return;
        }
      }
      _checkOut = day;
    });
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
