enum LeaseDuration {
  oneMonth(1, '1 month'),
  threeMonths(3, '3 months'),
  sixMonths(6, '6 months'),
  twelveMonths(12, '12 months'),
  flexible(null, 'Flexible');

  const LeaseDuration(this.months, this.label);

  final int? months;
  final String label;
}
