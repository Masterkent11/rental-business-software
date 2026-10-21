import 'package:customer_app/features/application/domain/face_guidance.dart';
import 'package:customer_app/features/application/domain/id_ocr_parser.dart';
import 'package:customer_app/features/application/domain/verification.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('reads explicitly labelled student IDs', () {
    final result = IdOcrParser.parse(const [
      OcrLine('STUDENT IDENTIFICATION'),
      OcrLine('STUDENT NAME: Ana Santos'),
      OcrLine('STUDENT NO: TEST-2026-001'),
      OcrLine('DATE OF BIRTH: 2000-01-01')
    ]);
    expect(result.readable, true);
    expect(result.details.documentType, 'Student ID');
    expect(result.details.documentNumber, 'TEST-2026-001');
    expect(result.details.fullName, 'Ana Santos');
  });

  test('reads actual labelled OCR and leaves uncertain fields blank', () {
    final result = IdOcrParser.parse(const [
      OcrLine('PAMBANSANG PAGKAKAKILANLAN'),
      OcrLine('APELYIDO / LAST NAME'),
      OcrLine('SANTOS', .91),
      OcrLine('GIVEN NAMES'),
      OcrLine('ANA', .92),
      OcrLine('DATE OF BIRTH'),
      OcrLine('06 JUL 1998', .8),
      OcrLine('1234-5678-9012-3456', .9)
    ]);
    expect(result.details.fullName, 'ANA SANTOS');
    expect(result.details.dateOfBirth, '1998-07-06');
    expect(result.details.documentType, 'Philippine National ID');
    expect(result.details.documentNumber, '1234-5678-9012-3456');
    expect(result.confidence['dateOfBirth'], .8);
    expect(result.confidence['fullName'], isNull);
    expect(result.readable, isTrue);
    final uncertain = IdOcrParser.parse(
        const [OcrLine('PASSPORT'), OcrLine('DATE OF BIRTH'), OcrLine('07/06/1998'), OcrLine('OTHER')]);
    expect(uncertain.details.dateOfBirth, isEmpty);
    expect(uncertain.details.fullName, isEmpty);
  });
  test('validates calendar dates without normalizing impossible dates', () {
    const details = IdentityDetails(
        fullName: 'Ana Santos', dateOfBirth: '1998-02-30', documentType: 'Passport', documentNumber: 'TEST-0001');
    expect(details.validate(DateTime(2026)), isNotNull);
  });
  test('guides only one aligned face and maps mirrored movement directions', () {
    DetectedFacePose pose({double yaw = 0, double pitch = 0}) =>
        DetectedFacePose(centerX: .5, centerY: .5, widthRatio: .5, yaw: yaw, pitch: pitch, roll: 0);
    expect(FaceGuidance.problem([], FaceInstruction.align), isNotNull);
    expect(FaceGuidance.problem([pose(), pose()], FaceInstruction.align), contains('one person'));
    expect(FaceGuidance.problem([pose()], FaceInstruction.align), isNull);
    expect(FaceGuidance.problem([pose(yaw: -20)], FaceInstruction.right), isNull);
    expect(FaceGuidance.problem([pose(yaw: 20)], FaceInstruction.right), isNotNull);
    expect(FaceGuidance.problem([pose(yaw: 20)], FaceInstruction.left), isNull);
    expect(FaceGuidance.problem([pose(pitch: 20)], FaceInstruction.up), isNull);
  });
  test('unknown server verification states fail closed', () {
    expect(() => VerificationStatus.parse('APPROVED_BY_CLIENT'), throwsFormatException);
  });
}
