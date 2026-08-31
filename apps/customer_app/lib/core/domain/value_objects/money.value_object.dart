import 'package:intl/intl.dart';

/// **The single source of truth for money display.**
///
/// Philippine Peso formatting rule:
/// - Every price in the domain is an **integer number of centavos**.
/// - ₱8,500.00 is `850000`.
/// - ₱120.50 is `12050`.
///
/// Standard prices (monthly rent, nightly rate) format as whole pesos with
/// thousands separators and the currency symbol: `₱8,500`.
///
/// If a fractional amount ever appears (fees, taxes, refunds), centavos are
/// preserved: `₱8,500.50`.
abstract final class Money {
  static final _wholeFormatter = NumberFormat.currency(
    locale: 'en_PH',
    symbol: '₱',
    decimalDigits: 0,
  );

  static final _fractionFormatter = NumberFormat.currency(
    locale: 'en_PH',
    symbol: '₱',
    decimalDigits: 2,
  );

  /// Format an amount given in integer centavos into a display string.
  static String formatPesos(int centavos) {
    final pesos = centavos / 100.0;
    if (centavos % 100 == 0) {
      return _wholeFormatter.format(pesos);
    }
    return _fractionFormatter.format(pesos);
  }
}
