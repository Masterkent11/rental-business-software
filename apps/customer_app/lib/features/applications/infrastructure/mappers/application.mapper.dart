import '../../domain/entities/rental_application.entity.dart';
import '../../domain/value_objects/application_status.value_object.dart';
import '../dto/application.dto.dart';

extension ApplicationMapper on ApplicationDto {
  RentalApplication toDomain() => RentalApplication(
        id: id,
        reference: reference,
        listingTitle: listingTitle,
        propertyName: propertyName,
        areaLabel: areaLabel,
        photo: photo,
        monthlyCentavos: monthlyCentavos,
        moveIn: moveIn,
        submittedAt: submittedAt,
        status: switch (status.toUpperCase()) {
          'APPROVED' => ApplicationStatus.approved,
          'REJECTED' => ApplicationStatus.rejected,
          'WITHDRAWN' => ApplicationStatus.withdrawn,
          'UNDER_REVIEW' => ApplicationStatus.underReview,
          'EXPIRED' => ApplicationStatus.expired,
          _ => ApplicationStatus.submitted,
        },
        documents: documents,
        decidedAt: decidedAt,
        reason: reason,
        moveInCostCentavos: moveInCostCentavos,
        holdExpiresAt: holdExpiresAt,
      );
}
