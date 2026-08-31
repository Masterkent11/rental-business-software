import '../../domain/entities/booking_hold.entity.dart';
import '../../domain/entities/payment_intent.entity.dart';
import '../../domain/entities/stay_receipt.entity.dart';
import '../../domain/value_objects/booking_status.value_object.dart';
import '../dto/booking.dto.dart';

extension BookingHoldMapper on BookingHoldDto {
  BookingHold toDomain() => BookingHold(
        id: id,
        resourceId: resourceId,
        nights: nights,
        expiresAt: expiresAt,
      );
}

extension PaymentIntentMapper on PaymentIntentDto {
  PaymentIntent toDomain() => PaymentIntent(
        paymentId: paymentId,
        amountCentavos: amountCentavos,
        nights: nights,
      );
}

extension SandboxPaymentConfirmationMapper on SandboxPaymentConfirmationDto {
  SandboxPaymentConfirmation toDomain() => SandboxPaymentConfirmation(
        applied: applied,
        stayId: stayId,
      );
}

extension StayReceiptMapper on StayReceiptDto {
  StayReceipt toDomain() => StayReceipt(
        id: id,
        reference: reference,
        listingTitle: listingTitle,
        propertyName: propertyName,
        areaLabel: areaLabel,
        cityLabel: cityLabel,
        startsOn: startsOn,
        endsOn: endsOn,
        nights: nights,
        paidCentavos: paidCentavos,
        paidAt: paidAt,
        state: state,
        photo: photo,
        stateLabel: stateLabel,
        bucket: switch (bucket.toUpperCase()) {
          'PAST' => BookingStatus.past,
          'CANCELLED' => BookingStatus.cancelled,
          _ => BookingStatus.active,
        },
      );
}
