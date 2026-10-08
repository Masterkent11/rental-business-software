import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../design/tokens.dart';
import '../discovery_controller.dart';

class IntentToggle extends StatelessWidget {
  const IntentToggle({required this.value, required this.onChanged, super.key});

  final MarketIntent value;
  final ValueChanged<MarketIntent> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F2F5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          for (final (intent, label) in const [(MarketIntent.rent, 'Rent'), (MarketIntent.buy, 'Buy')])
            Expanded(
              child: Semantics(
                button: true,
                selected: intent == value,
                label: label,
                excludeSemantics: true,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    if (intent == value) return;
                    HapticFeedback.selectionClick();
                    onChanged(intent);
                  },
                  child: AnimatedContainer(
                    duration: Tokens.quick,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: intent == value ? Tokens.primaryNavy : Colors.transparent,
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: Text(
                      label,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: intent == value ? Colors.white : Tokens.muted,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class BuyCategoryList extends StatelessWidget {
  const BuyCategoryList({required this.selected, required this.onSelected, super.key});

  final BuyCategory? selected;
  final ValueChanged<BuyCategory?> onSelected;

  static IconData iconFor(BuyCategory category) => switch (category) {
        BuyCategory.houseAndLot => Icons.house_outlined,
        BuyCategory.condo => Icons.apartment_outlined,
        BuyCategory.townhouse => Icons.holiday_village_outlined,
        BuyCategory.lot => Icons.landscape_outlined,
        BuyCategory.commercial => Icons.storefront_outlined,
        BuyCategory.preSelling => Icons.construction_outlined,
      };

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 64,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: Tokens.scroll,
        padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
        itemCount: BuyCategory.values.length,
        separatorBuilder: (_, __) => const SizedBox(width: 9),
        itemBuilder: (context, index) {
          final category = BuyCategory.values[index];
          final isSelected = category == selected;
          return Semantics(
            button: true,
            selected: isSelected,
            label: category.label,
            excludeSemantics: true,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () {
                HapticFeedback.selectionClick();
                onSelected(isSelected ? null : category);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                width: 82,
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
                decoration: BoxDecoration(
                  color: isSelected ? Tokens.softBlue : const Color(0xFFF7F8FA),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isSelected ? Tokens.primaryBlue.withValues(alpha: 0.4) : const Color(0x99E7E8EC)),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(iconFor(category), size: 21, color: isSelected ? Tokens.primaryBlue : Tokens.primaryNavy),
                    const SizedBox(height: 4),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        category.label,
                        maxLines: 1,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? Tokens.primaryNavy : Tokens.muted,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
