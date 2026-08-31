import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/design/app_image.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/domain/value_objects/money.value_object.dart';
import '../../domain/entities/stay_receipt.entity.dart';
import '../../domain/value_objects/booking_status.value_object.dart';
import '../controllers/booking_dates.controller.dart';
import '../widgets/empty_bookings.widget.dart';

class BookingsScreen extends ConsumerStatefulWidget {
  const BookingsScreen({super.key});

  @override
  ConsumerState<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends ConsumerState<BookingsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final staysAsync = ref.watch(myStaysProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Stays'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Upcoming'),
            Tab(text: 'Past'),
            Tab(text: 'Cancelled'),
          ],
        ),
      ),
      body: staysAsync.when(
        data: (stays) {
          return TabBarView(
            controller: _tabController,
            children: [
              _StaysList(stays: stays.where((s) => s.bucket == BookingStatus.active).toList()),
              _StaysList(stays: stays.where((s) => s.bucket == BookingStatus.past).toList()),
              _StaysList(stays: stays.where((s) => s.bucket == BookingStatus.cancelled).toList()),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Could not load stays: $err')),
      ),
    );
  }
}

class _StaysList extends StatelessWidget {
  const _StaysList({required this.stays});
  final List<StayReceipt> stays;

  @override
  Widget build(BuildContext context) {
    if (stays.isEmpty) return const EmptyBookings();
    return ListView.separated(
      padding: const EdgeInsets.all(Tokens.gutter),
      itemCount: stays.length,
      separatorBuilder: (_, __) => const SizedBox(height: Tokens.s16),
      itemBuilder: (context, index) => _StayCard(stay: stays[index]),
    );
  }
}

class _StayCard extends StatelessWidget {
  const _StayCard({required this.stay});
  final StayReceipt stay;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFmt = DateFormat('MMM d, yyyy');

    return InkWell(
      onTap: () => context.push('/bookings/${stay.id}', extra: stay),
      borderRadius: Tokens.borderLg,
      child: Container(
        decoration: BoxDecoration(
          color: Tokens.surface,
          borderRadius: Tokens.borderLg,
          border: Border.all(color: Tokens.line),
          boxShadow: Tokens.shadowSm,
        ),
        child: Row(
          children: [
            if (stay.photo != null)
              AppImage(
                url: stay.photo!,
                width: 100,
                height: 100,
                borderRadius: const BorderRadius.only(
                  topLeft: Tokens.radLg,
                  bottomLeft: Tokens.radLg,
                ),
              ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(Tokens.s12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      stay.listingTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    Text(stay.propertyName, style: theme.textTheme.bodySmall?.copyWith(color: Tokens.inkMuted)),
                    const SizedBox(height: Tokens.s6),
                    Text(
                      '${dateFmt.format(stay.startsOn)} – ${dateFmt.format(stay.endsOn)}',
                      style: theme.textTheme.labelSmall?.copyWith(color: Tokens.ink),
                    ),
                    Text(
                      '${Money.formatPesos(stay.paidCentavos)} · ${stay.stateLabel}',
                      style: theme.textTheme.labelSmall?.copyWith(color: Tokens.accent, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
