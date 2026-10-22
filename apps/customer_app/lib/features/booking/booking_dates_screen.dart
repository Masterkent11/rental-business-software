import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/availability_repository.dart';
import '../../data/listing_repository.dart';
import '../../design/money.dart';
import '../../design/quantity_stepper.dart';
import '../../design/tokens.dart';
import '../../fixtures/view_models.dart';
import 'widgets/date_range_calendar.dart';

class BookingDatesScreen extends ConsumerStatefulWidget {
  const BookingDatesScreen({required this.listingId, this.selectionOnly = false, this.initialSelection, super.key});

  final String listingId;
  final bool selectionOnly;
  final QuoteRequest? initialSelection;

  @override
  ConsumerState<BookingDatesScreen> createState() => _BookingDatesScreenState();
}

class _BookingDatesScreenState extends ConsumerState<BookingDatesScreen> {
  DateTime? _checkIn;
  DateTime? _checkOut;
  int _guests = 1;

  @override
  void initState() {
    super.initState();
    _checkIn = widget.initialSelection?.checkIn;
    _checkOut = widget.initialSelection?.checkOut;
    _guests = widget.initialSelection?.guests ?? 1;
  }

  int get _nights => (_checkIn != null && _checkOut != null) ? _checkOut!.difference(_checkIn!).inDays : 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final detailAsync = ref.watch(listingDetailProvider(widget.listingId));
    final detail = detailAsync.valueOrNull;

    if (detailAsync.isLoading && detail == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final nightly = detail?.card.isSale == false ? detail?.card.priceCentavos : null;
    if (detail == null || nightly == null || detail.card.kind != ListingKind.shortTerm) {
      return Scaffold(
        appBar: AppBar(title: const Text('Select dates')),
        body: Center(
          child: Text(
              detail == null ? 'This place is no longer available.' : 'This property can’t be booked by the night.'),
        ),
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
        if (night.status.isTaken) DateTime(night.night.year, night.night.month, night.night.day),
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
            '${Money.perNight(nightly)} · minimum $minStay nights',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: Tokens.s20),
          QuantityStepper(
            label: 'Guests',
            caption: 'Up to ${card.maxGuests}',
            value: _guests.clamp(1, card.maxGuests),
            min: 1,
            max: card.maxGuests,
            onChanged: (value) => setState(() => _guests = value),
          ),
          const SizedBox(height: Tokens.s20),
          if (nightsAsync.hasError) ...[
            const Text('Could not load available dates. Please retry.'),
            TextButton(
                onPressed: () =>
                    ref.invalidate(availabilityProvider((resourceId: card.resourceId, from: windowFrom, to: windowTo))),
                child: const Text('Retry availability')),
          ] else if (!loaded)
            const Text('Loading available dates…'),
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
        quote: canBook
            ? ref.watch(stayQuoteProvider((
                listingId: widget.listingId,
                checkIn: _checkIn!,
                checkOut: _checkOut!,
                guests: _guests.clamp(1, card.maxGuests),
              )))
            : null,
        checkIn: _checkIn,
        checkOut: _checkOut,
        enabled: canBook,
        buttonLabel: widget.selectionOnly ? 'Use these dates' : 'Review booking',
        onBook: () {
          if (widget.selectionOnly) {
            Navigator.of(context).pop<QuoteRequest>((
              listingId: widget.listingId,
              checkIn: _checkIn!,
              checkOut: _checkOut!,
              guests: _guests.clamp(1, card.maxGuests)
            ));
            return;
          }
          context.push(
            Routes.checkout(
              listingId: widget.listingId,
              resourceId: card.resourceId,
              checkIn: _checkIn!,
              checkOut: _checkOut!,
              guests: _guests.clamp(1, card.maxGuests),
            ),
          );
        },
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

      for (var d = _checkIn!; d.isBefore(day); d = d.add(const Duration(days: 1))) {
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
    required this.quote,
    required this.checkIn,
    required this.checkOut,
    required this.enabled,
    required this.onBook,
    required this.buttonLabel,
  });

  final int nights;
  final AsyncValue<StayQuote>? quote;
  final DateTime? checkIn;
  final DateTime? checkOut;
  final bool enabled;
  final VoidCallback onBook;
  final String buttonLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final format = DateFormat('MMM d');
    final priced = quote?.valueOrNull;
    final failed = quote?.hasError == true;

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(top: BorderSide(color: theme.colorScheme.outlineVariant)),
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
                        '${format.format(checkIn!)}  ${format.format(checkOut!)} · $nights ${nights == 1 ? "night" : "nights"}',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                    if (priced != null)
                      Text(Money.peso(priced.totalCentavos), style: theme.textTheme.headlineSmall)
                    else if (!failed)
                      const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                  ],
                ),
                if (failed)
                  Padding(
                    padding: const EdgeInsets.only(top: Tokens.s8),
                    child: Text(
                      quote!.error is ApiException
                          ? (quote!.error as ApiException).message
                          : 'We could not price these dates.',
                      style: theme.textTheme.bodySmall?.copyWith(color: Tokens.taken),
                    ),
                  )
                else if (priced != null && !priced.available)
                  Padding(
                    padding: const EdgeInsets.only(top: Tokens.s8),
                    child: Text(
                      'Some of these nights were just taken. Pick other dates.',
                      style: theme.textTheme.bodySmall?.copyWith(color: Tokens.taken),
                    ),
                  ),
                const SizedBox(height: Tokens.s12),
              ] else
                Padding(
                  padding: const EdgeInsets.only(bottom: Tokens.s12),
                  child: Text(
                    'Pick a check-in and check-out date',
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ),
              FilledButton(
                onPressed: enabled && priced != null && priced.available ? onBook : null,
                child: Text(buttonLabel),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
