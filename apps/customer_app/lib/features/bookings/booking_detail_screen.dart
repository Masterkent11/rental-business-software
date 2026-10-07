import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/booking_repository.dart';
import '../../design/app_image.dart';
import '../../design/components.dart';
import '../../design/money.dart';
import '../../design/tokens.dart';
import 'bookings_screen.dart';

class BookingDetailScreen extends ConsumerWidget {
  const BookingDetailScreen({required this.bookingId, this.justConfirmed = false, super.key});

  final String bookingId;
  final bool justConfirmed;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final booking = ref.watch(myBookingProvider(bookingId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Booking'),
        leading: IconButton(
          tooltip: 'Back',
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => context.canPop() ? context.pop() : context.go(Routes.bookings),
        ),
      ),
      body: switch (booking) {
        AsyncError(:final error) => ErrorState(
            message: error is ApiException ? error.message : 'We could not load this booking.',
            onRetry: () => ref.invalidate(myBookingProvider(bookingId)),
          ),
        AsyncData(value: null) => EmptyState(
            icon: Icons.search_off,
            title: 'Booking not found',
            message: 'It may belong to a different account.',
            actionLabel: 'My bookings',
            onAction: () => context.go(Routes.bookings),
          ),
        AsyncData(:final value?) => _Detail(booking: value, justConfirmed: justConfirmed),
        _ => const Center(child: CircularProgressIndicator()),
      },
      bottomNavigationBar: booking.valueOrNull?.listingId == null
          ? null
          : SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s12),
                child: AppButton(
                  label: 'Message the owner',
                  icon: Icons.chat_bubble_outline,
                  secondary: true,
                  onPressed: () {
                    final value = booking.valueOrNull!;
                    context.push(
                      value.conversationId != null
                          ? Routes.conversation(value.conversationId!)
                          : Routes.startConversation(listingId: value.listingId!, bookingId: value.id),
                    );
                  },
                ),
              ),
            ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.booking, required this.justConfirmed});

  final BookingSummaryView booking;
  final bool justConfirmed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final date = DateFormat('EEE, MMM d, y');
    return ListView(
      physics: Tokens.scroll,
      padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s40),
      children: [
        if (justConfirmed && booking.isPaid)
          Container(
            margin: const EdgeInsets.only(bottom: Tokens.s20),
            padding: const EdgeInsets.all(Tokens.s16),
            decoration: BoxDecoration(
              color: Tokens.available.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(Tokens.rMd),
            ),
            child: Row(
              children: [
                const Icon(Icons.check_circle, color: Tokens.available),
                const SizedBox(width: Tokens.s12),
                Expanded(
                  child: Text(
                    'You’re booked! The owner has been notified.',
                    style: theme.textTheme.titleMedium?.copyWith(color: Tokens.available),
                  ),
                ),
              ],
            ),
          ),
        ClipRRect(
          borderRadius: BorderRadius.circular(Tokens.rLg),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: booking.photo == null
                ? Container(color: theme.colorScheme.outlineVariant)
                : AppImage(url: booking.photo!, cacheWidth: 900),
          ),
        ),
        const SizedBox(height: Tokens.s16),
        Wrap(
          spacing: Tokens.s12,
          runSpacing: Tokens.s8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            StatusBadge(label: booking.statusLabel, tone: bookingTone(booking.bucket)),
            SelectableText('Reference #${booking.reference}', style: theme.textTheme.labelSmall),
          ],
        ),
        const SizedBox(height: Tokens.s12),
        Text(booking.listingTitle, style: theme.textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text('${booking.propertyName} · ${booking.areaLabel}, ${booking.cityLabel}', style: theme.textTheme.bodyMedium),
        if (booking.listingId != null)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: () => context.push(Routes.listing(booking.listingId!)),
              child: const Text('View the place'),
            ),
          ),
        const SizedBox(height: Tokens.s12),
        _Card(
          children: [
            _Line(label: 'Check-in', value: date.format(booking.startsOn)),
            _Line(label: 'Check-out', value: date.format(booking.endsOn)),
            _Line(label: 'Nights', value: '${booking.nights}'),
            if (booking.guests != null) _Line(label: 'Guests', value: '${booking.guests}'),
          ],
        ),
        const SizedBox(height: Tokens.s16),
        _Card(
          children: [
            if (booking.isPaid) ...[
              _Line(label: 'Paid', value: Money.peso(booking.paidCentavos)),
              if (booking.paidAt != null)
                _Line(label: 'Paid on', value: DateFormat('MMM d, h:mm a').format(booking.paidAt!.toLocal())),
              const _Line(label: 'Method', value: 'Sandbox payment'),
            ] else if (booking.bucket == BookingBucket.pendingPayment)
              Text(
                booking.holdExpiresAt == null
                    ? 'Payment was not completed.'
                    : 'Your dates are held until ${DateFormat('h:mm a').format(booking.holdExpiresAt!.toLocal())}. Payment was not completed — book again to finish.',
                style: theme.textTheme.bodyMedium,
              )
            else
              Text('No payment recorded.', style: theme.textTheme.bodyMedium),
          ],
        ),
      ],
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(Tokens.s16),
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(Tokens.rMd),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Expanded(child: Text(label, style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant))),
          Text(value, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
