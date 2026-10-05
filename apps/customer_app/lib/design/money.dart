import 'package:intl/intl.dart';

abstract final class Money {
  static final NumberFormat _peso = NumberFormat.currency(
    locale: 'en_PH',
    symbol: '₱',
    decimalDigits: 0,
  );

  static final NumberFormat _pesoExact = NumberFormat.currency(
    locale: 'en_PH',
    symbol: '₱',
    decimalDigits: 2,
  );

  static String peso(int centavos) => _peso.format(centavos / 100);

  static String pesoExact(int centavos) => _pesoExact.format(centavos / 100);

  static String perMonth(int centavos) => '${peso(centavos)}/mo';
  static String perNight(int centavos) => '${peso(centavos)}/night';
}
