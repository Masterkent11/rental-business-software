import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../design/controls.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import '../../application/explore_controller.dart';
import '../../domain/explore_query.dart';
import '../../domain/listing_category.dart';
import 'filter_sheet_frame.dart';

Future<void> showBuyFiltersSheet(BuildContext context, ExploreQuery seed) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _BuyFiltersSheet(seed: seed),
    );

class _BuyFiltersSheet extends ConsumerStatefulWidget {
  const _BuyFiltersSheet({required this.seed});

  final ExploreQuery seed;

  @override
  ConsumerState<_BuyFiltersSheet> createState() => _BuyFiltersSheetState();
}

class _BuyFiltersSheetState extends ConsumerState<_BuyFiltersSheet> {
  static const _floorAreas = <int?>[null, 50, 100, 150, 250];

  late BuyRefinement _buy;
  late Set<QuickFilter> _features;

  @override
  void initState() {
    super.initState();
    final query = ref.read(exploreQueryProvider(widget.seed));
    _buy = query.buy;
    _features = {...query.quickFilters};
  }

  void _apply() {
    final current = ref.read(exploreQueryProvider(widget.seed));
    ref.read(exploreQueryProvider(widget.seed).notifier).replace(
          ExploreQuery(
            intent: current.intent,
            category: current.category,
            text: current.text,
            area: current.area,
            sort: current.sort,
            buy: _buy,
            quickFilters: _features,
          ),
        );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return FilterSheetFrame(
      onReset: () => setState(() {
        _buy = const BuyRefinement();
        _features = {};
      }),
      onApply: _apply,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: Tokens.s20),
          child: AppMinimumPicker(
            label: 'Bedrooms',
            value: _buy.minBedrooms,
            onChanged: (value) => setState(
              () => _buy = BuyRefinement(
                minBedrooms: value,
                minBathrooms: _buy.minBathrooms,
                minFloorAreaSqm: _buy.minFloorAreaSqm,
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: Tokens.s20),
          child: AppMinimumPicker(
            label: 'Bathrooms',
            value: _buy.minBathrooms,
            onChanged: (value) => setState(
              () => _buy = BuyRefinement(
                minBedrooms: _buy.minBedrooms,
                minBathrooms: value,
                minFloorAreaSqm: _buy.minFloorAreaSqm,
              ),
            ),
          ),
        ),
        FilterSection(
          title: 'Floor area',
          child: FilterChoiceWrap<int?>(
            options: _floorAreas,
            labelFor: (area) => area == null ? 'Any' : '$area m²+',
            isSelected: (area) => area == _buy.minFloorAreaSqm,
            onTap: (area) => setState(
              () => _buy = BuyRefinement(
                minBedrooms: _buy.minBedrooms,
                minBathrooms: _buy.minBathrooms,
                minFloorAreaSqm: area,
              ),
            ),
          ),
        ),
        FilterSection(
          title: 'Features',
          child: FilterChoiceWrap<QuickFilter>(
            options: QuickFilter.forIntent(MarketIntent.buy),
            labelFor: (filter) => filter.label,
            isSelected: _features.contains,
            onTap: (filter) => setState(() {
              if (!_features.remove(filter)) _features.add(filter);
            }),
          ),
        ),
        const Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.lock_outline, size: Tokens.iconSm, color: Tokens.muted),
            SizedBox(width: Tokens.s6),
            Expanded(
              child: Text(
                'Sale prices are shared privately by the agent or owner when you inquire, so there is no price filter.',
                style: AppText.caption,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
