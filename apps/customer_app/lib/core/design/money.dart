import 'package:intl/intl.dart';

abstract final class Money {
  static final _wholeFormat = NumberFormat('#,##0', 'en_PH');
  static final _exactFormat = NumberFormat('#,##0.00', 'en_PH');

  static String peso(int centavos) {
    final pesos = (centavos / 100).round();
    return '₱${_wholeFormat.format(pesos)}';
  }

  static String pesoExact(int centavos) {
    if (centavos % 100 == 0) return peso(centavos);
    return '₱${_exactFormat.format(centavos / 100)}';
  }

  static String perMonth(int centavos) => '${peso(centavos)}/mo';

  static String perNight(int centavos) => '${peso(centavos)}/night';
}
