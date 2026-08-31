import '../value_objects/application_status.value_object.dart';

/// Domain entity representing a long-term rental application.
class RentalApplication {
  const RentalApplication({
    required this.id,
    required this.reference,
    required this.listingTitle,
    required this.propertyName,
    required this.areaLabel,
    required this.photo,
    required this.monthlyCentavos,
    required this.moveIn,
    required this.submittedAt,
    required this.status,
    required this.documents,
    this.decidedAt,
    this.reason,
    this.moveInCostCentavos,
    this.holdExpiresAt,
  });

  final String id;
  final String reference;
  final String listingTitle;
  final String propertyName;
  final String areaLabel;
  final String photo;
  final int monthlyCentavos;
  final DateTime moveIn;
  final DateTime submittedAt;
  final ApplicationStatus status;
  final List<String> documents;
  final DateTime? decidedAt;
  final String? reason;
  final int? moveInCostCentavos;
  final DateTime? holdExpiresAt;

  RentalApplication copyWith({
    String? id,
    String? reference,
    String? listingTitle,
    String? propertyName,
    String? areaLabel,
    String? photo,
    int? monthlyCentavos,
    DateTime? moveIn,
    DateTime? submittedAt,
    ApplicationStatus? status,
    List<String>? documents,
    DateTime? decidedAt,
    String? reason,
    int? moveInCostCentavos,
    DateTime? holdExpiresAt,
  }) {
    return RentalApplication(
      id: id ?? this.id,
      reference: reference ?? this.reference,
      listingTitle: listingTitle ?? this.listingTitle,
      propertyName: propertyName ?? this.propertyName,
      areaLabel: areaLabel ?? this.areaLabel,
      photo: photo ?? this.photo,
      monthlyCentavos: monthlyCentavos ?? this.monthlyCentavos,
      moveIn: moveIn ?? this.moveIn,
      submittedAt: submittedAt ?? this.submittedAt,
      status: status ?? this.status,
      documents: documents ?? this.documents,
      decidedAt: decidedAt ?? this.decidedAt,
      reason: reason ?? this.reason,
      moveInCostCentavos: moveInCostCentavos ?? this.moveInCostCentavos,
      holdExpiresAt: holdExpiresAt ?? this.holdExpiresAt,
    );
  }
}
