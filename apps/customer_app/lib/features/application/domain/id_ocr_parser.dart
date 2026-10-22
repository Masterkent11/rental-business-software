import 'verification.dart';

class OcrLine {
  const OcrLine(this.text, [this.confidence]);
  final String text;
  final double? confidence;
}

class IdOcrResult {
  const IdOcrResult(this.details, this.confidence, this.lineCount);
  final IdentityDetails details;
  final Map<String, double> confidence;
  final int lineCount;
  bool get readable => lineCount >= 4 && details.documentType.isNotEmpty;
}

abstract final class IdOcrParser {
  static IdOcrResult parse(List<OcrLine> source) {
    final lines = source.where((line) => line.text.trim().isNotEmpty).toList();
    ({String value, double? confidence}) field(String label) {
      final pattern = RegExp('^(?:$label)\\s*[:.\\-/]*\\s*', caseSensitive: false);
      for (var i = 0; i < lines.length; i++) {
        final line = lines[i];
        if (!pattern.hasMatch(line.text.trim())) continue;
        final suffix = line.text.trim().replaceFirst(pattern, '').trim();
        if (suffix.isNotEmpty) return (value: suffix, confidence: line.confidence);
        if (i + 1 < lines.length) return (value: lines[i + 1].text.trim(), confidence: lines[i + 1].confidence);
      }
      return (value: '', confidence: null);
    }

    final full = field(r'FULL NAME|STUDENT NAME|PANGALAN');
    final first = field(r'(?:MGA )?GIVEN NAMES?|FIRST NAME|MGA PANGALAN(?:\s*/\s*GIVEN NAMES?)?');
    final last = field(r'SURNAME|LAST NAME|APELYIDO(?:\s*/\s*LAST NAME)?');
    final middle = field(r'MIDDLE NAME|GITNANG APELYIDO(?:\s*/\s*MIDDLE NAME)?');
    final birth = field(r'DATE OF BIRTH|BIRTH ?DATE|PETSA NG KAPANGANAKAN(?:\s*/\s*DATE OF BIRTH)?');
    var number = field(r'(?:STUDENT(?: ID)?|DOCUMENT|ID|PASSPORT|LICENSE)(?:\s*(?:NO\.?|NUMBER))|PCN|PSN');
    final header = lines.map((line) => line.text).join(' ').toUpperCase();
    final type = header.contains('PAMBANSANG PAGKAKAKILANLAN') || header.contains('PHILIPPINE IDENTIFICATION')
        ? 'Philippine National ID'
        : header.contains('PASSPORT')
            ? 'Passport'
            : RegExp(r'DRIVER.?S? LICENSE').hasMatch(header)
                ? 'Philippine Driver’s License'
                : RegExp(r'\b(?:STUDENT|SCHOOL) (?:ID|IDENTIFICATION)\b').hasMatch(header)
                    ? 'Student ID'
                    : '';
    if (number.value.isEmpty && type == 'Philippine National ID') {
      for (final line in lines) {
        final candidate = RegExp(r'\b\d{4}[- ]\d{4}[- ]\d{4}(?:[- ]\d{4})?\b').firstMatch(line.text);
        if (candidate != null) {
          number = (value: candidate.group(0)!, confidence: line.confidence);
          break;
        }
      }
    }
    final nameParts = [first.value, middle.value, last.value].where((part) => part.isNotEmpty).toList();
    final name = full.value.isNotEmpty ? full.value : nameParts.join(' ');
    final confidence = <String, double>{};
    if (full.value.isNotEmpty && full.confidence != null) confidence['fullName'] = full.confidence!;
    if (birth.confidence != null) confidence['dateOfBirth'] = birth.confidence!;
    if (number.confidence != null) confidence['documentNumber'] = number.confidence!;
    return IdOcrResult(
        IdentityDetails(
            fullName: name, dateOfBirth: _date(birth.value), documentType: type, documentNumber: number.value),
        confidence,
        lines.length);
  }

  static String _date(String raw) {
    final value = raw.trim();
    final iso = RegExp(r'^\d{4}[-/]\d{2}[-/]\d{2}$');
    if (iso.hasMatch(value)) return value.replaceAll('/', '-');
    final match = RegExp(r'^(\d{1,2})[ -]([A-Za-z]{3,9})[ ,\-]+(\d{4})$').firstMatch(value);
    if (match == null) return '';
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    final month = months.indexOf(match.group(2)!.substring(0, 3).toUpperCase()) + 1;
    if (month == 0) return '';
    return '${match.group(3)}-${month.toString().padLeft(2, '0')}-${match.group(1)!.padLeft(2, '0')}';
  }
}
