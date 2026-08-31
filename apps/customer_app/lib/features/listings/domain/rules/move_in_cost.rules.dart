import '../entities/move_in_cost.entity.dart';

abstract final class MoveInCostRules {
  static MoveInCost standard({
    required int monthlyRentCentavos,
    int advanceMonths = 1,
    int depositMonths = 2,
    int utilityDepositCentavos = 0,
  }) {
    final advance = monthlyRentCentavos * advanceMonths;
    final deposit = monthlyRentCentavos * depositMonths;
    final lines = <({String label, int centavos})>[
      (label: 'First month rent', centavos: monthlyRentCentavos),
      if (advance > 0)
        (label: 'Advance ($advanceMonths mo)', centavos: advance),
      if (deposit > 0)
        (label: 'Deposit ($depositMonths mo)', centavos: deposit),
      if (utilityDepositCentavos > 0)
        (label: 'Utility deposit', centavos: utilityDepositCentavos),
    ];
    final total = lines.fold<int>(0, (sum, l) => sum + l.centavos);
    return MoveInCost(lines: lines, totalCentavos: total);
  }

  static MoveInCost computeStandardMoveIn(
    int monthlyRentCentavos, {
    int advanceMonths = 1,
    int depositMonths = 2,
  }) =>
      standard(
        monthlyRentCentavos: monthlyRentCentavos,
        advanceMonths: advanceMonths,
        depositMonths: depositMonths,
      );
}
