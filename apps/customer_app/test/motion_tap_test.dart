import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:customer_app/core/design/motion.dart';

void main() {
  testWidgets('Squeeze still delivers the tap it wraps', (tester) async {
    var taps = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: Squeeze(
              haptic: false,
              onTap: () => taps++,
              child: const SizedBox(width: 200, height: 120),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.byType(Squeeze));
    await tester.pumpAndSettle();

    expect(taps, 1);
  });

  testWidgets('Reveal does not block taps on the content it reveals', (
    tester,
  ) async {
    var taps = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: Reveal(
              order: 3,
              child: Squeeze(
                haptic: false,
                onTap: () => taps++,
                child: const SizedBox(width: 200, height: 120),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.pump(const Duration(milliseconds: 40));
    await tester.tap(find.byType(Squeeze), warnIfMissed: false);
    await tester.pumpAndSettle();

    expect(taps, 1);
  });
}
