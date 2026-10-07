import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/availability_repository.dart';
import '../../data/booking_repository.dart';
import '../../data/ids.dart';
import '../../data/listing_repository.dart';
import '../../design/app_image.dart';
import '../../design/components.dart';
import '../../design/money.dart';
import '../../design/tokens.dart';

class BookingCheckoutScreen extends ConsumerStatefulWidget {
  const BookingCheckoutScreen({
    required this.listingId,
    required this.resourceId,
    required this.checkIn,
    required this.checkOut,
    this.guests = 1,
    super.key,
  });

  final String listingId;
  final String resourceId;
  final DateTime checkIn;
  final DateTime checkOut;
  final int guests;

  @override
  ConsumerState<BookingCheckoutScreen> createState() => _BookingCheckoutScreenState();
}

enum _Step { review, holding, paying }

class _BookingCheckoutScreenState extends ConsumerState<BookingCheckoutScreen> {
  final String _idempotencyKey = newUuid();
  _Step _step = _Step.review;
  String? _error;
  bool _conflict = false;

  QuoteRequest get _request => (
        listingId: widget.listingId,
        checkIn: widget.checkIn,
        checkOut: widget.checkOut,
        guests: widget.guests,
      );

  Future<void> _confirm() async {
    setState(() {
      _step = _Step.holding;
      _error = null;
      _conflict = false;
    });
    final repo = ref.read(bookingRepositoryProvider);
    String? bookingId;
    try {
      final hold = await repo.createBooking(
        listingId: widget.listingId,
        startsOn: widget.checkIn,
        endsOn: widget.checkOut,
        guests: widget.guests,
        idempotencyKey: _idempotencyKey,
      );
      bookingId = hold.id;
      if (!mounted) return;
      setState(() => _step = _Step.paying);
      final intent = await repo.startPaymentIntent(hold.id);
      if (!intent.isSandbox) {
        throw const ApiException('Online payment is not available yet. Your dates are held for a few minutes.');
      }
      final result = await repo.confirmSandboxPayment(occupancyId: hold.id, paymentId: intent.paymentId);
      if (!result.applied && result.stayId == null) {
        throw const ApiException('The payment did not go through. Please try again.');
      }
      ref.invalidate(myBookingsProvider);
      if (!mounted) return;
      HapticFeedback.mediumImpact();
      context.go(Routes.booking(hold.id, confirmed: true));
    } on ApiException catch (error) {
      if (!mounted) return;
      if (error.datesUnavailable || error.isConflict) {
        ref.invalidate(availabilityProvider);
        ref.invalidate(stayQuoteProvider(_request));
        setState(() {
          _step = _Step.review;
          _conflict = true;
          _error = 'Someone just booked some of these nights. Pick new dates to continue.';
        });
        return;
      }
      ref.invalidate(myBookingsProvider);
      setState(() {
        _step = _Step.review;
        _error = bookingId == null
            ? error.message
            : '${error.message} You can finish payment from My Bookings.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final quote = ref.watch(stayQuoteProvider(_request));
    final detail = ref.watch(listingDetailProvider(widget.listingId)).valueOrNull;
    final format = DateFormat('EEE, MMM d');
    final busy = _step != _Step.review;

    return Scaffold(
      appBar: AppBar(title: const Text('Review and pay')),
      body: switch (quote) {
        AsyncError(:final error) => ErrorState(
            title: 'These dates can’t be booked',
            message: error is ApiException ? error.message : 'We could not price this stay.',
            onRetry: () => ref.invalidate(stayQuoteProvider(_request)),
          ),
        AsyncData(:final value) => ListView(
            physics: Tokens.scroll,
            padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s32),
            children: [
              if (detail != null)
                Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(Tokens.rSm),
                      child: SizedBox(
                        width: 84,
                        height: 72,
                        child: detail.card.photos.isEmpty
                            ? Container(color: theme.colorScheme.outlineVariant)
                            : AppImage(url: detail.card.photos.first, cacheWidth: 252),
                      ),
                    ),
                    const SizedBox(width: Tokens.s12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(detail.card.title, style: theme.textTheme.titleMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 2),
                          Text(detail.card.location, style: theme.textTheme.bodySmall),
                        ],
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: Tokens.s24),
              _Row(label: 'Check-in', value: format.format(widget.checkIn)),
              _Row(label: 'Check-out', value: format.format(widget.checkOut)),
              _Row(label: 'Guests', value: '${widget.guests}'),
              const Padding(padding: EdgeInsets.symmetric(vertical: Tokens.s16), child: Divider(height: 1)),
              Text('Price details', style: theme.textTheme.titleMedium),
              const SizedBox(height: Tokens.s12),
              for (final line in value.lines) _Row(label: line.label, value: Money.peso(line.centavos)),
              const Padding(padding: EdgeInsets.symmetric(vertical: Tokens.s12), child: Divider(height: 1)),
              Row(
                children: [
                  Text('Total (PHP)', style: theme.textTheme.titleMedium),
                  const Spacer(),
                  Text(Money.peso(value.totalCentavos), style: theme.textTheme.headlineSmall),
                ],
              ),
              const SizedBox(height: Tokens.s20),
              if (!value.available && !_conflict)
                const _Notice(
                  icon: Icons.event_busy_outlined,
                  text: 'Some of these nights are no longer available. Go back and pick other dates.',
                  error: true,
                ),
              if (_error != null) _Notice(icon: Icons.error_outline, text: _error!, error: true),
              const _Notice(
                icon: Icons.verified_user_outlined,
                text: 'Demo payment: this environment uses a payment sandbox. No real money moves. Prices are calculated by the server.',
              ),
            ],
          ),
        _ => const Center(child: CircularProgressIndicator()),
      },
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s12),
          child: _conflict
              ? AppButton(label: 'Pick new dates', secondary: true, onPressed: () => context.pop())
              : AppButton(
                  label: switch (_step) {
                    _Step.review => quote.valueOrNull == null
                        ? 'Confirm and pay'
                        : 'Confirm and pay ${Money.peso(quote.valueOrNull!.totalCentavos)}',
                    _Step.holding => 'Holding your dates…',
                    _Step.paying => 'Processing payment…',
                  },
                  busy: busy,
                  onPressed: quote.valueOrNull?.available == true ? _confirm : null,
                ),
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(child: Text(label, style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant))),
          Text(value, style: theme.textTheme.bodyLarge),
        ],
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.text, this.error = false});

  final IconData icon;
  final String text;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = error ? Tokens.taken : theme.colorScheme.onSurfaceVariant;
    return Padding(
      padding: const EdgeInsets.only(bottom: Tokens.s12),
      child: Container(
        padding: const EdgeInsets.all(Tokens.s12),
        decoration: BoxDecoration(
          color: error ? Tokens.taken.withValues(alpha: 0.08) : theme.colorScheme.onSurface.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(Tokens.rSm),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: Tokens.s8),
            Expanded(child: Text(text, style: theme.textTheme.bodySmall?.copyWith(color: color))),
          ],
        ),
      ),
    );
  }
}
