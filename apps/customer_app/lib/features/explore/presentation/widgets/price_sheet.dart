import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../design/money.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import '../../application/explore_controller.dart';
import '../../application/explore_results.dart';
import '../../domain/explore_query.dart';
import 'filter_sheet_frame.dart';

Future<void> showPriceSheet(BuildContext context, ExploreQuery seed) => showListingSheet<void>(
      context,
      builder: (_) => _PriceSheet(seed: seed),
    );

class _PriceSheet extends ConsumerStatefulWidget {
  const _PriceSheet({required this.seed});

  final ExploreQuery seed;

  @override
  ConsumerState<_PriceSheet> createState() => _PriceSheetState();
}

class _PriceSheetState extends ConsumerState<_PriceSheet> {
  static const _budgets = <int?>[null, 1000000, 2000000, 3500000, 5000000];

  int? _maxPrice;

  @override
  void initState() {
    super.initState();
    _maxPrice = ref.read(exploreQueryProvider(widget.seed)).maxPriceCentavos;
  }

  void _reset() => setState(() => _maxPrice = null);

  void _apply() {
    ref.read(exploreQueryProvider(widget.seed).notifier).setMaxPrice(_maxPrice);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final query = ref.watch(exploreQueryProvider(widget.seed));
    if (query.isBuy) {
      return const FilterSheetFrame(
        title: 'Price',
        children: [
          Padding(
            padding: EdgeInsets.symmetric(vertical: Tokens.s8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.lock_outline, size: Tokens.iconMd, color: Tokens.primaryNavy),
                SizedBox(width: Tokens.s8),
                Expanded(
                  child: Text(
                    'Sale prices are shared privately by the agent or owner when you inquire.',
                    style: AppText.body,
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }
    final draft = query.copyWith(maxPriceCentavos: _maxPrice, clearMaxPrice: _maxPrice == null);
    final count = ref.watch(exploreMatchCountProvider(draft)).valueOrNull;
    final applyLabel = count != null ? 'Show $count properties' : 'Show results';
    return FilterSheetFrame(
      title: 'Price',
      onReset: _reset,
      onApply: _apply,
      applyLabel: applyLabel,
      children: [
        FilterSection(
          title: 'Budget',
          subtitle: 'Select your preferred maximum budget.',
          divider: false,
          child: FilterChoiceWrap<int?>(
            options: _budgets,
            labelFor: (budget) => budget == null ? 'Any' : 'Under ${Money.peso(budget)}',
            isSelected: (budget) => budget == _maxPrice,
            onTap: (budget) => setState(() => _maxPrice = budget),
          ),
        ),
      ],
    );
  }
}
