enum DisplayCurrency {
  php(code: 'PHP', symbol: '₱', name: 'Philippine peso');

  const DisplayCurrency({required this.code, required this.symbol, required this.name});

  final String code;
  final String symbol;
  final String name;

  static const DisplayCurrency active = DisplayCurrency.php;
}
