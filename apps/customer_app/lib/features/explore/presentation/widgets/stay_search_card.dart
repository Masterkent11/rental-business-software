import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../design/components.dart';
import '../../../../design/controls.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import '../../../location/location_controller.dart';
import '../../application/stay_search_controller.dart';
import '../../domain/explore_query.dart';
import 'stay_date_fields.dart';
import 'stay_occupancy_field.dart';

class StaySearchCard extends ConsumerWidget {
  const StaySearchCard({required this.args, required this.onSearch, required this.onChooseLocation, super.key});

  final StaySearchArgs args;
  final ValueChanged<ExploreQuery> onSearch;
  final VoidCallback onChooseLocation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(staySearchProvider(args));
    final controller = ref.read(staySearchProvider(args).notifier);
    final location = ref.watch(locationProvider);
    return Container(
      padding: const EdgeInsets.all(Tokens.s12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Tokens.rCard),
        border: Border.all(color: Tokens.hairline),
        boxShadow: Tokens.lift,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (state.offersModeChoice) ...[
            AppSegmentedControl<RentMode>(
              segments: [for (final mode in state.modes) AppSegment(value: mode, label: _modeLabel(mode))],
              selected: state.mode,
              onChanged: controller.setMode,
            ),
            const SizedBox(height: Tokens.s12),
          ],
          StayDateFields(args: args),
          const SizedBox(height: Tokens.s8),
          StayOccupancyField(args: args),
          if (state.validationError != null) ...[
            const SizedBox(height: Tokens.s8),
            Text(state.validationError!, style: AppText.caption.copyWith(color: Tokens.taken)),
          ],
          const SizedBox(height: Tokens.s12),
          Row(
            children: [
              Expanded(
                child: AppButton(
                  label: 'Search',
                  icon: Icons.search_rounded,
                  onPressed: () {
                    final query = controller.search();
                    if (query != null) onSearch(query);
                  },
                ),
              ),
              const SizedBox(width: Tokens.s8),
              AppSquareIconButton(
                icon: location.isSpecified ? Icons.map_rounded : Icons.map_outlined,
                semanticLabel: 'Location: ${location.place.label}. Change location',
                size: Tokens.primaryButtonHeight,
                active: location.isSpecified,
                onPressed: onChooseLocation,
              ),
            ],
          ),
        ],
      ),
    );
  }

  static String _modeLabel(RentMode mode) => switch (mode) {
        RentMode.shortStay => 'Short stay',
        RentMode.monthly => 'Monthly stay',
      };
}
