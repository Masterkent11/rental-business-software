import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/auth_repository.dart';
import '../../data/booking_repository.dart';
import '../../design/app_image.dart';
import '../../design/components.dart';
import '../../design/money.dart';
import '../../design/motion.dart';
import '../../design/tokens.dart';
import 'widgets/empty_bookings.dart';

enum _Tab { upcoming, past }

BadgeTone bookingTone(BookingBucket bucket) => switch (bucket) {
      BookingBucket.upcoming => BadgeTone.info,
      BookingBucket.current => BadgeTone.good,
      BookingBucket.pendingPayment => BadgeTone.warning,
      BookingBucket.cancelled => BadgeTone.bad,
      BookingBucket.past => BadgeTone.neutral,
    };

class BookingsScreen extends ConsumerStatefulWidget {
  const BookingsScreen({super.key});

  @override
  ConsumerState<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends ConsumerState<BookingsScreen> {
  _Tab _tab = _Tab.upcoming;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final signedIn = ref.watch(isSignedInProvider);
    final bookings = ref.watch(myBookingsProvider);
    final all = bookings.valueOrNull ?? const <BookingSummaryView>[];
    final visible = all.where((b) => _tab == _Tab.upcoming ? b.isActive : !b.isActive).toList(growable: false);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(myBookingsProvider.future),
        child: CustomScrollView(
          physics: Tokens.scroll,
          slivers: [
            SliverSafeArea(
              bottom: false,
              sliver: SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s16, Tokens.gutter, Tokens.s16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Bookings', style: theme.textTheme.displaySmall),
                      const SizedBox(height: Tokens.s4),
                      Text('Your stays. Monthly applications live under Profile.', style: theme.textTheme.bodySmall),
                      if (signedIn) ...[
                        const SizedBox(height: Tokens.s20),
                        SegmentedButton<_Tab>(
                          showSelectedIcon: false,
                          segments: [
                            ButtonSegment(
                                value: _Tab.upcoming, label: Text('Upcoming (${all.where((b) => b.isActive).length})')),
                            ButtonSegment(
                                value: _Tab.past, label: Text('Past (${all.where((b) => !b.isActive).length})')),
                          ],
                          selected: {_tab},
                          onSelectionChanged: (next) => setState(() => _tab = next.first),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
            if (!signedIn)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyState(
                  icon: Icons.luggage_outlined,
                  title: 'Your trips live here',
                  message: 'Sign in to see your bookings, pay for held dates, and message hosts.',
                  actionLabel: 'Sign in',
                  onAction: () =>
                      context.push(Routes.auth(from: Routes.bookings, reason: 'Sign in to see your bookings.')),
                ),
              )
            else if (bookings.hasError && all.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: ErrorState(
                  message: bookings.error is ApiException
                      ? (bookings.error as ApiException).message
                      : 'We could not load your bookings.',
                  onRetry: () => ref.invalidate(myBookingsProvider),
                ),
              )
            else if (bookings.isLoading && all.isEmpty)
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
                sliver: SliverList.list(
                  children: const [
                    SkeletonBox(height: 200, radius: Tokens.rLg),
                    SizedBox(height: Tokens.s20),
                    SkeletonBox(height: 200, radius: Tokens.rLg),
                  ],
                ),
              )
            else if (visible.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Padding(
                  padding: const EdgeInsets.all(Tokens.s32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const EmptyBookingsArt(),
                      const SizedBox(height: Tokens.s20),
                      Text(
                        _tab == _Tab.upcoming ? 'No upcoming stays' : 'No past stays yet',
                        style: theme.textTheme.headlineSmall,
                      ),
                      const SizedBox(height: Tokens.s8),
                      Text(
                        'Find a place you love and book your dates — it shows up here right away.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      ),
                      const SizedBox(height: Tokens.s20),
                      AppButton(label: 'Explore places', expand: false, onPressed: () => context.go(Routes.discover)),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s64),
                sliver: SliverList.separated(
                  itemCount: visible.length,
                  separatorBuilder: (_, __) => const SizedBox(height: Tokens.s20),
                  itemBuilder: (context, i) => Reveal(order: i.clamp(0, 3), child: _BookingCard(booking: visible[i])),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  const _BookingCard({required this.booking});

  final BookingSummaryView booking;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final format = DateFormat('MMM d');
    return Semantics(
      button: true,
      label: '${booking.listingTitle}, ${booking.statusLabel}',
      child: Squeeze(
        onTap: () => context.push(Routes.booking(booking.id)),
        child: Container(
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(Tokens.rLg),
            boxShadow: Tokens.lift,
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AspectRatio(
                aspectRatio: 16 / 8,
                child: booking.photo == null
                    ? Container(color: theme.colorScheme.outlineVariant)
                    : AppImage(url: booking.photo!, cacheWidth: 800),
              ),
              Padding(
                padding: const EdgeInsets.all(Tokens.s16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        StatusBadge(label: booking.statusLabel, tone: bookingTone(booking.bucket)),
                        const Spacer(),
                        Text('#${booking.reference}', style: theme.textTheme.labelSmall),
                      ],
                    ),
                    const SizedBox(height: Tokens.s8),
                    Text(booking.listingTitle,
                        style: theme.textTheme.titleMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(
                      '${format.format(booking.startsOn)} – ${format.format(booking.endsOn)} · ${booking.nights} night${booking.nights == 1 ? '' : 's'}',
                      style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                    if (booking.isPaid) ...[
                      const SizedBox(height: 2),
                      Text('${Money.peso(booking.paidCentavos)} paid', style: theme.textTheme.bodySmall),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
