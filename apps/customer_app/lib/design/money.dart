import 'package:intl/intl.dart';

/// PHP formatting for the whole app.
///
/// Amounts are **integer centavos**, never doubles — the rule the domain money
/// model fixes (docs/03-domain/money-model.md). Formatting is the only place a
/// peso value becomes a string, so there is exactly one place to get it wrong.
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

  /// `850000` -> `₱8,500`.
  static String peso(int centavos) => _peso.format(centavos / 100);

  /// `850050` -> `₱8,500.50`. For anything that has to reconcile.
  static String pesoExact(int centavos) => _pesoExact.format(centavos / 100);

  static String perMonth(int centavos) => '${peso(centavos)}/mo';
  static String perNight(int centavos) => '${peso(centavos)}/night';
}
