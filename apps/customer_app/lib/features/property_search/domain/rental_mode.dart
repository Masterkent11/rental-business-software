enum RentalMode {
  shortStay,
  monthly;

  String get label => switch (this) {
        RentalMode.shortStay => 'Short stay',
        RentalMode.monthly => 'Monthly rental',
      };
}
