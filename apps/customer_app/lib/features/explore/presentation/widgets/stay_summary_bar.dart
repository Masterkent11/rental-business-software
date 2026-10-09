import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../design/controls.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import '../../../location/location_controller.dart';
import '../../domain/explore_query.dart';

class StaySummaryBar extends ConsumerWidget {
  const StaySummaryBar({required this.query, required this.onEdit, super.key});

  static final DateFormat _day = DateFormat('EEE, d MMM');

  final ExploreQuery query;
  final VoidCallback onEdit;

  static String describe(StaySearch? stay) => switch (stay) {
        ShortStaySearch(:final checkIn, :final checkOut, :final guests) =>
          '${_day.format(checkIn)} – ${_day.format(checkOut)} · $guests ${guests == 1 ? 'guest' : 'guests'}',
        MonthlySearch(:final moveIn, :final occupants) =>
          'Move in ${_day.format(moveIn)} · $occupants ${occupants == 1 ? 'occupant' : 'occupants'}',
        null => 'Any dates',
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final place = ref.watch(locationProvider.select((state) => state.place.label));
    return Container(
      padding: const EdgeInsets.fromLTRB(Tokens.s12, Tokens.s8, Tokens.s4, Tokens.s8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Tokens.rControl),
        border: Border.all(color: Tokens.hairline),
      ),
      child: Row(
        children: [
          Icon(
            query.stay is MonthlySearch ? Icons.event_outlined : Icons.date_range_outlined,
            size: Tokens.controlIcon,
            color: Tokens.primaryNavy,
          ),
          const SizedBox(width: Tokens.s8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(describe(query.stay), maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.fieldValue),
                const SizedBox(height: Tokens.s2),
                Text(place, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.fieldLabel),
              ],
            ),
          ),
          AppTextAction(label: 'Edit', onPressed: onEdit),
        ],
      ),
    );
  }
}
