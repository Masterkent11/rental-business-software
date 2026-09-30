import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../data/account_repository.dart';
import '../../design/app_image.dart';
import '../../design/glass.dart';
import '../../design/money.dart';
import '../../design/tokens.dart';
import '../../fixtures/view_models.dart';
import 'bookings_screen.dart' show toBookingView;

/// A booking, in detail.
///
/// The journey names exactly what a guest needs after paying: **confirmation,
/// check-in details, the address, and how to contact the property.** Those four
/// come first, in that order — everything below them is reference.
///
/// Nothing here mentions a lease, a tenancy, or a deposit. A stay creates none
/// of them, and a screen that hinted otherwise would be lying about what the
/// guest bought.
///
/// Reads the same [staysProvider] the bookings list already fetches — there is
/// exactly one source for a customer's stays, not a list backed by the API and
/// a detail screen backed by a fixture.
class BookingDetailScreen extends ConsumerWidget {
  const BookingDetailScreen({required this.bookingId, super.key});

  final String bookingId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final staysAsync = ref.watch(staysProvider);
    final theme = Theme.of(context);

    // "Could not reach the server" and "no such booking" are different facts,
    // exactly as bookings_screen.dart already distinguishes them for the list.
    if (staysAsync.hasError) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(Tokens.gutter),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Could not load this booking',
                    style: theme.textTheme.titleMedium),
                const SizedBox(height: Tokens.s8),
                Text(
                  '${staysAsync.error}',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall,
                ),
                const SizedBox(height: Tokens.s16),
                FilledButton(
                  onPressed: () => ref.invalidate(staysProvider),
                  child: const Text('Try again'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (staysAsync.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final stays = staysAsync.valueOrNull ?? const <StayReceiptView>[];
    final matches = stays.where((stay) => stay.id == bookingId);
    if (matches.isEmpty) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('Booking not found')),
      );
    }

    final booking = toBookingView(matches.first);
    final long = DateFormat('EEE, d MMM');
    final active = booking.status == BookingStatus.active;
    final nightly = booking.totalCentavos ~/ booking.nights;

    return Scaffold(
      body: Stack(
        children: [
          CustomScrollView(
            physics: Tokens.scroll,
            slivers: [
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 260,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      AppImage(
                        url: booking.photo,
                        fallbackIcon: Icons.apartment_outlined,
                        seed: booking.id.length,
                      ),
                      const PhotoScrim(top: 0.4, bottom: 0.55),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(
                  Tokens.gutter,
                  Tokens.s24,
                  Tokens.gutter,
                  Tokens.s40,
                ),
                sliver: SliverList.list(
                  children: [
                    if (booking.stateLabel != null)
                      _Badge(
                          label: booking.stateLabel!, status: booking.status),
                    const SizedBox(height: Tokens.s12),
                    Text(
                      booking.listingTitle,
                      style: theme.textTheme.headlineMedium,
                    ),
                    const SizedBox(height: Tokens.s4),
                    Text(
                      '${booking.propertyName} · ${booking.areaLabel}',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: Tokens.s24),

                    // Dates first — it is the thing a guest reopens the app for.
                    _Card(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: _Stat(
                                label: 'CHECK-IN',
                                value: long.format(booking.checkIn),
                                sub: 'from 2:00 PM',
                              ),
                            ),
                            Container(
                              width: 1,
                              height: 40,
                              color: theme.colorScheme.outlineVariant,
                            ),
                            Expanded(
                              child: _Stat(
                                label: 'CHECK-OUT',
                                value: long.format(booking.checkOut),
                                sub: 'by 12:00 NN',
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: Tokens.s16),
                        Divider(color: theme.colorScheme.outlineVariant),
                        const SizedBox(height: Tokens.s12),
                        Text(
                          '${booking.nights} night'
                          '${booking.nights == 1 ? "" : "s"} · '
                          '${booking.guests} guest'
                          '${booking.guests == 1 ? "" : "s"}',
                          style: theme.textTheme.bodyMedium,
                        ),
                      ],
                    ),

                    if (active) ...[
                      const SizedBox(height: Tokens.s16),
                      _Card(
                        children: [
                          _Row(
                            icon: Icons.location_on_outlined,
                            title: 'Getting there',
                            body: '${booking.propertyName}, '
                                '${booking.areaLabel}. The full address and the '
                                'gate code arrive the day before check-in.',
                          ),
                          const SizedBox(height: Tokens.s16),
                          _Row(
                            icon: Icons.chat_bubble_outline,
                            title: 'Contact the property',
                            body: 'Questions about arrival, parking, or Wi-Fi '
                                'go to the property directly.',
                            action: 'Message',
                            onAction: () => _soon(context, 'Messaging'),
                          ),
                        ],
                      ),
                    ],

                    const SizedBox(height: Tokens.s16),
                    _Card(
                      children: [
                        Text(
                          'What you paid',
                          style: theme.textTheme.titleMedium,
                        ),
                        const SizedBox(height: Tokens.s12),
                        _Line(
                          label: '${Money.peso(nightly)} × ${booking.nights} '
                              'night${booking.nights == 1 ? "" : "s"}',
                          value: Money.peso(booking.totalCentavos),
                        ),
                        const SizedBox(height: Tokens.s8),
                        Divider(color: theme.colorScheme.outlineVariant),
                        const SizedBox(height: Tokens.s8),
                        _Line(
                          label: 'Paid in full',
                          value: Money.peso(booking.totalCentavos),
                          strong: true,
                        ),
                        const SizedBox(height: Tokens.s12),
                        Text(
                          'Nightly stays are prepaid. There is no deposit and '
                          'nothing to settle at checkout.',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),

                    if (active) ...[
                      const SizedBox(height: Tokens.s16),
                      _Card(
                        children: [
                          Text(
                            'If plans change',
                            style: theme.textTheme.titleMedium,
                          ),
                          const SizedBox(height: Tokens.s8),
                          Text(
                            'Free cancellation up to 7 days before check-in. '
                            'After that the stay is non-refundable.',
                            style: theme.textTheme.bodyMedium,
                          ),
                          const SizedBox(height: Tokens.s12),
                          OutlinedButton(
                            onPressed: () => _soon(context, 'Cancellation'),
                            child: const Text('Cancel this booking'),
                          ),
                        ],
                      ),
                    ] else ...[
                      const SizedBox(height: Tokens.s16),
                      OutlinedButton.icon(
                        onPressed: () => _soon(context, 'Receipts'),
                        icon: const Icon(Icons.receipt_long_outlined, size: 18),
                        label: const Text('Receipt'),
                      ),
                    ],

                    const SizedBox(height: Tokens.s20),
                    Center(
                      child: Text(
                        booking.reference,
                        style: theme.textTheme.labelSmall,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.all(Tokens.s16),
                child: Row(
                  children: [
                    Glass.circle(
                      onTap: () => Navigator.of(context).maybePop(),
                      child: const Icon(
                        Icons.arrow_back_ios_new,
                        size: 16,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static void _soon(BuildContext context, String what) {
    HapticFeedback.selectionClick();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$what needs the API contracts from Step 5.')),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label, required this.status});

  final String label;
  final BookingStatus status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      BookingStatus.active => Tokens.available,
      BookingStatus.past => Theme.of(context).colorScheme.onSurfaceVariant,
      BookingStatus.cancelled => Tokens.taken,
    };

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: color.withOpacity(0.10),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style:
              Theme.of(context).textTheme.labelMedium?.copyWith(color: color),
        ),
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(Tokens.s20),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(Tokens.rMd),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: children),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.sub});

  final String label;
  final String value;
  final String sub;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.labelSmall),
        const SizedBox(height: Tokens.s4),
        Text(value, style: theme.textTheme.titleMedium),
        Text(sub, style: theme.textTheme.bodySmall),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.icon,
    required this.title,
    required this.body,
    this.action,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String body;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: Tokens.s12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: theme.textTheme.titleMedium),
              const SizedBox(height: 2),
              Text(body, style: theme.textTheme.bodyMedium),
              if (action != null) ...[
                const SizedBox(height: Tokens.s8),
                OutlinedButton(onPressed: onAction, child: Text(action!)),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _Line extends StatelessWidget {
  const _Line({required this.label, required this.value, this.strong = false});

  final String label;
  final String value;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final style =
        strong ? theme.textTheme.titleMedium : theme.textTheme.bodyMedium;

    return Row(
      children: [
        Expanded(child: Text(label, style: style)),
        Text(value, style: strong ? theme.textTheme.titleMedium : style),
      ],
    );
  }
}
