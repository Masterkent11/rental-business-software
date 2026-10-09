import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import '../../domain/display_currency.dart';

class CurrencyButton extends StatelessWidget {
  const CurrencyButton({super.key});

  @override
  Widget build(BuildContext context) {
    const currency = DisplayCurrency.active;
    return Semantics(
      button: true,
      label: 'Currency: ${currency.name}',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.selectionClick();
          showModalBottomSheet<void>(context: context, showDragHandle: true, builder: (_) => const _CurrencySheet());
        },
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: Tokens.tap),
          child: Center(
            child: Container(
              height: Tokens.chipHeight,
              padding: const EdgeInsets.symmetric(horizontal: Tokens.s12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(Tokens.chipHeight / 2),
                border: Border.all(color: Tokens.hairline),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('${currency.symbol} ${currency.code}', style: AppText.chip.copyWith(color: Tokens.primaryNavy)),
                  const SizedBox(width: Tokens.s2),
                  const Icon(Icons.keyboard_arrow_down_rounded, size: Tokens.iconSm, color: Tokens.primaryNavy),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CurrencySheet extends StatelessWidget {
  const _CurrencySheet();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.gutter, Tokens.s16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Currency', style: AppText.sectionTitle),
            const SizedBox(height: Tokens.s8),
            for (final currency in DisplayCurrency.values)
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('${currency.name} (${currency.code})', style: AppText.control),
                leading: Text(currency.symbol, style: AppText.cardTitle),
                trailing: currency == DisplayCurrency.active
                    ? const Icon(Icons.check_rounded, color: Tokens.primaryNavy)
                    : null,
                onTap: () => Navigator.of(context).pop(),
              ),
            const SizedBox(height: Tokens.s4),
            const Text('Owners list their prices in Philippine pesos.', style: AppText.caption),
          ],
        ),
      ),
    );
  }
}
