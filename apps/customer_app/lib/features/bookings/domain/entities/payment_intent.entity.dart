/// Domain entity representing a payment intent for a booking.
class PaymentIntent {
  const PaymentIntent({
    required this.paymentId,
    required this.amountCentavos,
    required this.nights,
  });

  final String paymentId;
  final int amountCentavos;
  final int nights;
}

/// Domain entity representing sandbox payment confirmation.
class SandboxPaymentConfirmation {
  const SandboxPaymentConfirmation({
    required this.applied,
    required this.stayId,
  });

  final bool applied;
  final String? stayId;
}
