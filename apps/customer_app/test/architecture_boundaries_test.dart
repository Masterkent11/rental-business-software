import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('feature domain sources remain independent of Flutter and infrastructure', () {
    final sources = Directory('lib/features').listSync(recursive: true).whereType<File>().where(
          (file) => file.path.contains('/domain/') && file.path.endsWith('.dart'),
        );
    for (final source in sources) {
      final imports = RegExp(r'''(?:import|export)\s+['"]([^'"]+)''').allMatches(source.readAsStringSync());
      for (final import in imports) {
        expect(import.group(1), isNot(matches(r'package:flutter|package:flutter_riverpod|/data/|/presentation/')),
            reason: source.path);
      }
    }
  });
}
