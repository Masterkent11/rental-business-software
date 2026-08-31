/// DTO for raw application JSON returned by backend API.
class ApplicationDto {
  const ApplicationDto({
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

  factory ApplicationDto.fromJson(Map<String, dynamic> json) {
    final docs = (json['documentNames'] as List<dynamic>? ??
            json['documents'] as List<dynamic>? ??
            const [])
        .whereType<String>()
        .toList(growable: false);

    final rawState = (json['state'] as String?) ??
        (json['status'] as String?) ??
        'SUBMITTED';
    final isApproved = rawState.toUpperCase() == 'APPROVED';

    final reservation = json['reservation'] as Map<String, dynamic>?;
    final holdExpiresAt = reservation?['expiresAt'] != null
        ? DateTime.parse(reservation!['expiresAt'] as String)
        : (json['holdExpiresAt'] != null
            ? DateTime.parse(json['holdExpiresAt'] as String)
            : null);

    final area = [json['areaLabel'], json['cityLabel']]
        .whereType<String>()
        .where((part) => part.isNotEmpty)
        .join(', ');

    return ApplicationDto(
      id: json['id'] as String? ?? '',
      reference: json['reference'] as String? ?? json['id'] as String? ?? '',
      listingTitle: json['listingTitle'] as String? ??
          json['resource']?['title'] as String? ??
          'Rental Unit',
      propertyName: json['propertyName'] as String? ??
          json['property']?['name'] as String? ??
          '',
      areaLabel: area.isNotEmpty
          ? area
          : (json['areaLabel'] as String? ??
              json['property']?['area'] as String? ??
              ''),
      photo: json['photo'] as String? ??
          (json['photos'] is List && (json['photos'] as List).isNotEmpty
              ? json['photos'][0] as String
              : ''),
      monthlyCentavos: (json['monthlyCentavos'] as num?)?.toInt() ??
          (json['monthlyRentCentavos'] as num?)?.toInt() ??
          0,
      moveIn: json['desiredMoveIn'] != null
          ? DateTime.parse(json['desiredMoveIn'] as String)
          : json['moveIn'] != null
              ? DateTime.parse(json['moveIn'] as String)
              : DateTime.now(),
      submittedAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : json['submittedAt'] != null
              ? DateTime.parse(json['submittedAt'] as String)
              : DateTime.now(),
      status: rawState,
      documents: docs,
      decidedAt: json['decidedAt'] != null
          ? DateTime.parse(json['decidedAt'] as String)
          : null,
      reason: json['decisionReason'] as String? ??
          json['rejectionReason'] as String? ??
          json['reason'] as String?,
      moveInCostCentavos:
          isApproved ? (json['moveInCostCentavos'] as num?)?.toInt() : null,
      holdExpiresAt: holdExpiresAt,
    );
  }

  final String id;
  final String reference;
  final String listingTitle;
  final String propertyName;
  final String areaLabel;
  final String photo;
  final int monthlyCentavos;
  final DateTime moveIn;
  final DateTime submittedAt;
  final String status;
  final List<String> documents;
  final DateTime? decidedAt;
  final String? reason;
  final int? moveInCostCentavos;
  final DateTime? holdExpiresAt;
}
