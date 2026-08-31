import '../entities/rental_application.entity.dart';
import '../value_objects/application_status.value_object.dart';

/// Pure domain business rules for rental applications.
abstract final class ApplicationRules {
  static bool canWithdraw(RentalApplication application) {
    return application.status == ApplicationStatus.submitted ||
        application.status == ApplicationStatus.underReview;
  }

  static bool isHoldActive(RentalApplication application, DateTime now) {
    if (application.status != ApplicationStatus.approved) return false;
    final expiresAt = application.holdExpiresAt;
    if (expiresAt == null) return false;
    return now.isBefore(expiresAt);
  }
}
