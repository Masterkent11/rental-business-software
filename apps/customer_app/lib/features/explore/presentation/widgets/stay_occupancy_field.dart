import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../design/quantity_stepper.dart';
import '../../../../design/tokens.dart';
import '../../application/stay_search_controller.dart';
import '../../domain/stay_validation.dart';
import 'stay_date_fields.dart';

class StayOccupancyField extends ConsumerWidget {
  const StayOccupancyField({required this.args, super.key});

  final StaySearchArgs args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(staySearchProvider(args));
    final controller = ref.read(staySearchProvider(args).notifier);
    return StayFieldFrame(
      child: Padding(
        padding: const EdgeInsets.only(left: Tokens.s12),
        child: Row(
          children: [
            const Icon(Icons.person_outline_rounded, size: Tokens.controlIcon, color: Tokens.primaryNavy),
            const SizedBox(width: Tokens.s12),
            Expanded(
              child: QuantityStepper(
                label: state.isShortStay ? 'Guests' : 'Occupants',
                value: state.isShortStay ? state.guests : state.occupants,
                min: OccupancyLimits.minGuests,
                max: OccupancyLimits.maxGuests,
                compact: true,
                onChanged: state.isShortStay ? controller.setGuests : controller.setOccupants,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
