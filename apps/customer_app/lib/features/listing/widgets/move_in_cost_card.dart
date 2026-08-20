import 'package:flutter/material.dart';

import '../../../design/money.dart';
import '../../../design/tokens.dart';
import '../../../fixtures/view_models.dart';

/// **The number the customer actually needs.**
///
/// From the journey: comparing bare monthly rent is misleading in the
/// Philippine market, where advance + deposit is typically three months up
/// front. An ₱8,500 unit costs ₱25,500 to enter, and the listing must make that
/// plain *before* the customer invests time in a viewing or an application.
///
/// The breakdown is shown, not just the total, because the deposit is the part
/// they get back — and a total with no explanation reads as a hidden fee.
class MoveInCostCard extends StatelessWidget {
  const MoveInCostCard({
    required this.cost,
    required this.monthlyCentavos,
    super.key,
  });

  final MoveInCostView cost;
  final int monthlyCentavos;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final months = (cost.totalCentavos / monthlyCentavos).round();

    return Container(
      padding: const EdgeInsets.all(Tokens.s20),
      decoration: BoxDecoration(
        color: Tokens.accent.withOpacity(0.06),
        borderRadius: BorderRadius.circular(Tokens.rMd),
        border: Border.all(color: Tokens.accent.withOpacity(0.18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'TO MOVE IN',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: Tokens.accent,
                      ),
                    ),
                    const SizedBox(height: Tokens.s4),
                    Text(
                      Money.peso(cost.totalCentavos),
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: Tokens.accent,
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(top: Tokens.s4),
                child: Text(
                  '≈ $months months up front',
                  style: theme.textTheme.bodySmall,
                ),
              ),
            ],
          ),
          const SizedBox(height: Tokens.s16),
          for (final line in cost.lines)
            Padding(
              padding: const EdgeInsets.only(bottom: Tokens.s8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(line.label, style: theme.textTheme.bodyMedium),
                  ),
                  Text(
                    Money.peso(line.centavos),
                    style: theme.textTheme.labelMedium,
                  ),
                ],
              ),
            ),
          const SizedBox(height: Tokens.s4),
          Text(
            'The deposit is returned at the end of the lease, less any '
            'unpaid rent or damage.',
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
