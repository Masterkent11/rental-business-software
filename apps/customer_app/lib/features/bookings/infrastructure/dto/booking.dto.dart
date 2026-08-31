/// DTO for raw hold / payment JSON payloads.
class BookingHoldDto {
  const BookingHoldDto({
    required this.id,
    required this.resourceId,
    required this.nights,
    this.expiresAt,
  });

  factory BookingHoldDto.fromJson(Map<String, dynamic> json) {
    return BookingHoldDto(
      id: json['id'] as String? ?? json['occupancyId'] as String? ?? '',
      resourceId: json['resourceId'] as String? ?? '',
      nights: json['nights'] as int? ?? 0,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
    );
  }

  final String id;
  final String resourceId;
  final int nights;
  final DateTime? expiresAt;
}

class PaymentIntentDto {
  const PaymentIntentDto({
    required this.paymentId,
    required this.amountCentavos,
    required this.nights,
  });

  factory PaymentIntentDto.fromJson(Map<String, dynamic> json) {
    return PaymentIntentDto(
      paymentId: json['paymentId'] as String? ?? '',
      amountCentavos: json['amountCentavos'] as int? ?? 0,
      nights: json['nights'] as int? ?? 0,
    );
  }

  final String paymentId;
  final int amountCentavos;
  final int nights;
}

class SandboxPaymentConfirmationDto {
  const SandboxPaymentConfirmationDto({
    required this.applied,
    this.stayId,
  });

  factory SandboxPaymentConfirmationDto.fromJson(Map<String, dynamic> json) {
    return SandboxPaymentConfirmationDto(
      applied: json['applied'] as bool? ?? false,
      stayId: json['stayId'] as String?,
    );
  }

  final bool applied;
  final String? stayId;
}

class StayReceiptDto {
  const StayReceiptDto({
    required this.id,
    required this.reference,
    required this.listingTitle,
    required this.propertyName,
    required this.areaLabel,
    required this.cityLabel,
    required this.startsOn,
    required this.endsOn,
    required this.nights,
    required this.paidCentavos,
    required this.paidAt,
    required this.state,
    required this.photo,
    required this.stateLabel,
    required this.bucket,
  });

  factory StayReceiptDto.fromJson(Map<String, dynamic> json) {
    return StayReceiptDto(
      id: json['id'] as String? ?? '',
      reference: json['reference'] as String? ?? json['id'] as String? ?? '',
      listingTitle: json['listingTitle'] as String? ?? 'Nightly Stay',
      propertyName: json['propertyName'] as String? ?? '',
      areaLabel: json['areaLabel'] as String? ?? '',
      cityLabel: json['cityLabel'] as String? ?? '',
      startsOn: DateTime.parse(json['startsOn'] as String),
      endsOn: DateTime.parse(json['endsOn'] as String),
      nights: json['nights'] as int? ?? 0,
      paidCentavos: json['paidCentavos'] as int? ?? 0,
      paidAt: json['paidAt'] != null ? DateTime.parse(json['paidAt'] as String) : null,
      state: json['state'] as String? ?? 'CONFIRMED',
      photo: json['photo'] as String?,
      stateLabel: json['stateLabel'] as String? ?? 'Confirmed',
      bucket: json['bucket'] as String? ?? 'ACTIVE',
    );
  }

  final String id;
  final String reference;
  final String listingTitle;
  final String propertyName;
  final String areaLabel;
  final String cityLabel;
  final DateTime startsOn;
  final DateTime endsOn;
  final int nights;
  final int paidCentavos;
  final DateTime? paidAt;
  final String state;
  final String? photo;
  final String stateLabel;
  final String bucket;
}
