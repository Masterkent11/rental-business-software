import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/router.dart';
import '../../design/app_image.dart';
import '../../design/money.dart';
import '../../design/tokens.dart';
import '../../fixtures/sample_data.dart';
import '../../fixtures/view_models.dart';
import 'widgets/empty_bookings.dart';

/// Bookings.
///
/// Short-term only, by design. A booking becomes a stay, the stay completes,
/// and the guest never becomes a tenant — so there is no lease anywhere on this
/// screen and no path to one. Long-term applications live under Account,
/// because they are a different lifecycle with a different vocabulary.
///
/// Three tabs, and **Cancelled is genuinely empty** in the sample data. That is
/// deliberate: the empty state is a screen a real customer meets constantly,
/// and it should be reachable by tapping rather than existing only in a design
/// file.
class BookingsScreen extends StatefulWidget {
  const BookingsScreen({super.key});

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  BookingStatus _tab = BookingStatus.active;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bookings = SampleData.bookingsWith(_tab);

    return Scaffold(
      body: CustomScrollView(
        physics: Tokens.scroll,
        slivers: [
          SliverSafeArea(
            bottom: false,
            sliver: SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  Tokens.gutter,
                  Tokens.s16,
                  Tokens.gutter,
                  Tokens.s16,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Bookings', style: theme.textTheme.displaySmall),
                    const SizedBox(height: Tokens.s4),
                    Text(
                      'Your nightly stays. Long-term applications live under '
                      'Account.',
                      style: theme.textTheme.bodySmall,
                    ),
                    const SizedBox(height: Tokens.s20),
                    _StatusTabs(
                      selected: _tab,
                      countFor: (s) => SampleData.bookingsWith(s).length,
                      onSelected: (s) => setState(() => _tab = s),
                    ),
                  ],
                ),
              ),
            ),
          ),

          if (bookings.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _EmptyState(status: _tab),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                Tokens.gutter,
                Tokens.s8,
                Tokens.gutter,
                Tokens.s40,
              ),
              sliver: SliverList.separated(
                itemCount: bookings.length,
                separatorBuilder: (_, __) => const SizedBox(height: Tokens.s16),
                itemBuilder: (context, i) => _BookingCard(booking: bookings[i]),
              ),
            ),
        ],
      ),
    );
  }
}

/// Segmented control. Counts are on the tabs, because "Past (2)" answers the
/// question the tab is asking without a trip through it.
class _StatusTabs extends StatelessWidget {
  const _StatusTabs({
    required this.selected,
    required this.countFor,
    required this.onSelected,
  });

  final BookingStatus selected;
  final int Function(BookingStatus) countFor;
  final ValueChanged<BookingStatus> onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Row(
        children: [
          for (final status in BookingStatus.values)
            Expanded(
              child: GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  onSelected(status);
                },
                behavior: HitTestBehavior.opaque,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  curve: Curves.easeOut,
                  height: 38,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: status == selected
                        ? theme.colorScheme.surface
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(999),
                    boxShadow: status == selected ? Tokens.lift : null,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Flexible(
                        child: Text(
                          status.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: status == selected
                                ? theme.colorScheme.onSurface
                                : theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                      if (countFor(status) > 0) ...[
                        const SizedBox(width: Tokens.s6),
                        Text(
                          '${countFor(status)}',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: status == selected
                                ? theme.colorScheme.onSurfaceVariant
                                : theme.colorScheme.onSurfaceVariant
                                    .withOpacity(0.7),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  const _BookingCard({required this.booking});

  final BookingView booking;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fmt = DateFormat('MMM d');
    final past = booking.status != BookingStatus.active;

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        context.push(Routes.booking(booking.id));
      },
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(Tokens.rLg),
          border: Border.all(color: theme.colorScheme.outlineVariant),
          color: theme.colorScheme.surfaceContainerHighest,
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Not CrossAxisAlignment.stretch: the card sits in a scroll view,
            // so stretching the cross axis asks for an infinite height.
            Row(
              children: [
                SizedBox(
                  width: 104,
                  height: 104,
                  child: Opacity(
                    opacity: past ? 0.55 : 1,
                    child: AppImage(
                      url: booking.photo,
                      fallbackIcon: Icons.apartment_outlined,
                      seed: booking.id.length,
                    ),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(Tokens.s12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (booking.stateLabel != null)
                          _StatePill(
                            label: booking.stateLabel!,
                            status: booking.status,
                          ),
                        const SizedBox(height: Tokens.s6),
                        Text(
                          booking.listingTitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleMedium,
                        ),
                        const SizedBox(height: Tokens.s2),
                        Text(
                          booking.areaLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: Tokens.s16,
                vertical: Tokens.s12,
              ),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                border: Border(
                  top: BorderSide(color: theme.colorScheme.outlineVariant),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.calendar_today_outlined,
                    size: 15,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: Tokens.s8),
                  Expanded(
                    child: Text(
                      '${fmt.format(booking.checkIn)} – '
                      '${fmt.format(booking.checkOut)} · '
                      '${booking.nights} night${booking.nights == 1 ? "" : "s"}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                  const SizedBox(width: Tokens.s8),
                  Text(
                    Money.peso(booking.totalCentavos),
                    style: theme.textTheme.titleMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatePill extends StatelessWidget {
  const _StatePill({required this.label, required this.status});

  final String label;
  final BookingStatus status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      BookingStatus.active => Tokens.available,
      BookingStatus.past => Theme.of(context).colorScheme.onSurfaceVariant,
      BookingStatus.cancelled => Tokens.taken,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.10),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(color: color),
      ),
    );
  }
}

/// Empty state: illustration, a sentence that says what this tab holds, and one
/// action. The action is the point — an empty screen with nothing to do is a
/// dead end, and the journey is explicit that empty results should offer a way
/// forward.
class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.status});

  final BookingStatus status;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final (title, body) = switch (status) {
      BookingStatus.active => (
          'No stays booked yet',
          'When you book a place for a few nights, it shows up here with your '
              'dates, address, and how to get in.',
        ),
      BookingStatus.past => (
          'Nothing finished yet',
          'Stays move here after checkout, with the receipt attached.',
        ),
      BookingStatus.cancelled => (
          'Nothing cancelled',
          'Cancelled bookings stay here with whatever was refunded, so there '
              'is never a question about what happened.',
        ),
    };

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        Tokens.s32,
        Tokens.s24,
        Tokens.s32,
        Tokens.s40,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const EmptyBookingsArt(),
          const SizedBox(height: Tokens.s24),
          Text(
            title,
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineSmall,
          ),
          const SizedBox(height: Tokens.s8),
          Text(
            body,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: Tokens.s24),
          SizedBox(
            width: 240,
            child: FilledButton(
              onPressed: () {
                HapticFeedback.selectionClick();
                context.go(Routes.discover);
              },
              child: const Text('Find a place to stay'),
            ),
          ),
        ],
      ),
    );
  }
}
