import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/design/tokens.dart';
import '../../../../core/domain/value_objects/money.value_object.dart';
import '../../../listings/domain/entities/listing.entity.dart';
import '../widgets/date_range_calendar.widget.dart';

class BookingDatesScreen extends ConsumerStatefulWidget {
  const BookingDatesScreen({required this.listing, super.key});
  final Listing listing;

  @override
  ConsumerState<BookingDatesScreen> createState() => _BookingDatesScreenState();
}

class _BookingDatesScreenState extends ConsumerState<BookingDatesScreen> {
  DateTime? _from;
  DateTime? _to;
  int _nights = 0;

  void _onRange(DateTime from, DateTime to) {
    setState(() {
      _from = from;
      _to = to;
      _nights = to.difference(from).inDays;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFmt = DateFormat('MMM d');
    final total = _nights * widget.listing.priceCentavos;

    return Scaffold(
      appBar: AppBar(title: const Text('Choose Dates')),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(Tokens.gutter),
              children: [
                DateRangeCalendar(
                  onRangeSelected: _onRange,
                  minimumStayNights: 1,
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter, vertical: Tokens.s12),
            decoration: const BoxDecoration(
              color: Tokens.surface,
              border: Border(top: BorderSide(color: Tokens.line)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_from != null && _to != null) ...[
                        Text(
                          '${Money.formatPesos(total)} total',
                          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '${dateFmt.format(_from!)} – ${dateFmt.format(_to!)} ($_nights ${_nights == 1 ? "night" : "nights"})',
                          style: theme.textTheme.bodySmall?.copyWith(color: Tokens.inkMuted),
                        ),
                      ] else ...[
                        Text('Select dates', style: theme.textTheme.titleSmall),
                        Text(
                          '${Money.formatPesos(widget.listing.priceCentavos)} / night',
                          style: theme.textTheme.bodySmall?.copyWith(color: Tokens.inkMuted),
                        ),
                      ],
                    ],
                  ),
                  FilledButton(
                    onPressed: (_from != null && _to != null && _nights > 0)
                        ? () {
                            context.push(
                              '/booking/checkout',
                              extra: (
                                listing: widget.listing,
                                startsOn: _from!,
                                endsOn: _to!,
                                nights: _nights,
                                totalCentavos: total,
                              ),
                            );
                          }
                        : null,
                    child: const Text('Reserve'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
