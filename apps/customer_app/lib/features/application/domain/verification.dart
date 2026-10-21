enum VerificationStatus {
  consentRequired,
  frontReady,
  ocrProcessing,
  ocrReview,
  detailsConfirmed,
  challengeActive,
  verifying,
  verified,
  manualReview,
  failed,
  expired,
  cancelled;

  static VerificationStatus parse(String value) => switch (value) {
        'CONSENT_REQUIRED' => consentRequired,
        'FRONT_READY' => frontReady,
        'OCR_PROCESSING' => ocrProcessing,
        'OCR_REVIEW' => ocrReview,
        'DETAILS_CONFIRMED' => detailsConfirmed,
        'CHALLENGE_ACTIVE' => challengeActive,
        'VERIFYING' => verifying,
        'VERIFIED' => verified,
        'MANUAL_REVIEW' => manualReview,
        'FAILED' => failed,
        'EXPIRED' => expired,
        'CANCELLED' => cancelled,
        _ => throw const FormatException('Unknown verification status'),
      };
}

enum FaceInstruction {
  align,
  right,
  left,
  up;

  String get wire => name.toUpperCase();
  static FaceInstruction parse(String value) => switch (value) {
        'ALIGN' => align,
        'RIGHT' => right,
        'LEFT' => left,
        'UP' => up,
        _ => throw const FormatException('Unknown facial instruction'),
      };
  String get title => switch (this) {
        align => 'Get ready',
        right => 'Tilt your head right',
        left => 'Tilt your head left',
        up => 'Look up',
      };
  String get description => switch (this) {
        align => 'Position one face within the guide in good lighting.',
        right => 'Slowly tilt your head to your right.',
        left => 'Now slowly tilt your head to your left.',
        up => 'Slowly look up, keeping your face visible.',
      };
}

class IdentityDetails {
  const IdentityDetails(
      {required this.fullName, required this.dateOfBirth, required this.documentType, required this.documentNumber});
  final String fullName;
  final String dateOfBirth;
  final String documentType;
  final String documentNumber;
  factory IdentityDetails.fromJson(Map<String, dynamic> json) => IdentityDetails(
        fullName: json['fullName'] as String? ?? '',
        dateOfBirth: json['dateOfBirth'] as String? ?? '',
        documentType: json['documentType'] as String? ?? '',
        documentNumber: json['documentNumber'] as String? ?? '',
      );
  Map<String, dynamic> toJson() => {
        'fullName': fullName,
        'dateOfBirth': dateOfBirth,
        'documentType': documentType,
        'documentNumber': documentNumber
      };
  String? validate(DateTime now) {
    final day = DateTime.tryParse(dateOfBirth);
    if (fullName.trim().isEmpty ||
        fullName.length > 200 ||
        documentType.trim().isEmpty ||
        documentType.length > 100 ||
        documentNumber.trim().isEmpty ||
        documentNumber.length > 100 ||
        !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(dateOfBirth) ||
        day == null ||
        day.toIso8601String().substring(0, 10) != dateOfBirth ||
        day.isAfter(now) ||
        day.year < 1900) {
      return 'Enter your full name, valid birth date, ID type and ID number.';
    }
    return null;
  }
}

class ApplicationDraft {
  const ApplicationDraft(
      {required this.id,
      required this.resourceId,
      required this.moveIn,
      required this.termMonths,
      required this.occupants,
      required this.message,
      this.applicationId});
  final String id;
  final String resourceId;
  final DateTime moveIn;
  final int termMonths;
  final int occupants;
  final String message;
  final String? applicationId;
  factory ApplicationDraft.fromJson(Map<String, dynamic> json) => ApplicationDraft(
        id: json['id'] as String,
        resourceId: json['resourceId'] as String,
        moveIn: DateTime.parse(json['desiredMoveIn'] as String),
        termMonths: json['desiredTermMonths'] as int,
        occupants: json['occupants'] as int,
        message: json['message'] as String? ?? '',
        applicationId: json['applicationId'] as String?,
      );
}

class VerificationSession {
  const VerificationSession(
      {required this.id,
      required this.draftId,
      required this.status,
      required this.expiresAt,
      this.version = 0,
      this.extracted,
      this.confidence = const {},
      this.challengeId,
      this.challengeExpiresAt,
      this.instruction,
      this.failure,
      this.retryable = false});
  final String id;
  final String draftId;
  final VerificationStatus status;
  final DateTime expiresAt;
  final int version;
  final IdentityDetails? extracted;
  final Map<String, num> confidence;
  final String? challengeId;
  final DateTime? challengeExpiresAt;
  final FaceInstruction? instruction;
  final String? failure;
  final bool retryable;
  bool get pending => status == VerificationStatus.ocrProcessing || status == VerificationStatus.verifying;
  factory VerificationSession.fromJson(Map<String, dynamic> json) {
    final details = json['extracted'] as Map<String, dynamic>?;
    final challenge = json['challenge'] as Map<String, dynamic>?;
    final failure = json['failure'] as Map<String, dynamic>?;
    return VerificationSession(
      id: json['id'] as String,
      draftId: json['draftId'] as String,
      status: VerificationStatus.parse(json['status'] as String),
      version: (json['version'] as num?)?.toInt() ?? 0,
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      extracted: details == null ? null : IdentityDetails.fromJson(details),
      confidence: (json['confidence'] as Map<String, dynamic>? ?? {}).map((key, value) => MapEntry(key, value as num)),
      challengeId: challenge?['id'] as String?,
      challengeExpiresAt: challenge == null ? null : DateTime.parse(challenge['expiresAt'] as String),
      instruction: challenge == null ? null : FaceInstruction.parse(challenge['instruction'] as String),
      failure: failure?['message'] as String?,
      retryable: failure?['retryable'] == true,
    );
  }
}
