/// Domain entity representing the move-in cost breakdown.
class MoveInCost {
  const MoveInCost({
    required this.lines,
    required this.totalCentavos,
  });

  final List<({String label, int centavos})> lines;
  final int totalCentavos;
}
