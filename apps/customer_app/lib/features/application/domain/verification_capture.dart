import 'dart:typed_data';
import 'id_ocr_parser.dart';
import 'verification.dart';

class VerificationCapture {
  const VerificationCapture(this.bytes, {this.ocr, this.instruction});
  final Uint8List bytes;
  final IdOcrResult? ocr;
  final FaceInstruction? instruction;
}
