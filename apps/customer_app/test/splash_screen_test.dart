import 'package:customer_app/features/launch/splash_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Widget buildApp({
    VoidCallback? onDone,
    bool disableAnimations = false,
    Size size = const Size(393, 852),
  }) {
    return MediaQuery(
      data: MediaQueryData(
        size: size,
        disableAnimations: disableAnimations,
      ),
      child: MaterialApp(
        home: SplashScreen(onDone: onDone),
      ),
    );
  }

  group('SplashScreen Widget Tests', () {
    testWidgets('1. SplashScreen renders', (tester) async {
      await tester.pumpWidget(buildApp());
      expect(find.byType(SplashScreen), findsOneWidget);
    });

    testWidgets('2. Find a place renders', (tester) async {
      await tester.pumpWidget(buildApp());
      await tester.pump(const Duration(milliseconds: 600));
      expect(find.text('Find a place'), findsOneWidget);
    });

    testWidgets('3. CEBU CITY renders', (tester) async {
      await tester.pumpWidget(buildApp());
      await tester.pump(const Duration(milliseconds: 800));
      expect(find.text('CEBU CITY'), findsOneWidget);
    });

    testWidgets('4. Loading text renders', (tester) async {
      await tester.pumpWidget(buildApp());
      await tester.pump(const Duration(milliseconds: 1000));
      expect(find.text('Finding your next place...'), findsOneWidget);
    });

    testWidgets('5. Progress starts at zero', (tester) async {
      await tester.pumpWidget(buildApp());
      await tester.pump(const Duration(milliseconds: 50));

      final progressFinder = find.descendant(
        of: find.byKey(const ValueKey('splash_progress_container')),
        matching: find.byType(FractionallySizedBox),
      );
      expect(progressFinder, findsOneWidget);
      final fractionalBox = tester.widget<FractionallySizedBox>(progressFinder);
      expect(fractionalBox.widthFactor, equals(0.0));
    });

    testWidgets('6. Progress advances over time to 100%', (tester) async {
      await tester.pumpWidget(buildApp());
      await tester.pump(const Duration(milliseconds: 100));

      await tester.pump(const Duration(milliseconds: 1500));
      final progressFinder = find.descendant(
        of: find.byKey(const ValueKey('splash_progress_container')),
        matching: find.byType(FractionallySizedBox),
      );
      final midBox = tester.widget<FractionallySizedBox>(progressFinder);
      expect(midBox.widthFactor, greaterThan(0.3));
      expect(midBox.widthFactor, lessThan(0.95));

      await tester.pump(const Duration(milliseconds: 800));
      final fullBox = tester.widget<FractionallySizedBox>(progressFinder);
      expect(fullBox.widthFactor, closeTo(1.0, 0.001));
    });

    testWidgets('7. Orbit progress advances from Point A to Point B',
        (tester) async {
      await tester.pumpWidget(buildApp());
      await tester.pump(const Duration(milliseconds: 100));

      final orbitFinder = find.byKey(const ValueKey('splash_orbit_mark'));
      expect(orbitFinder, findsOneWidget);

      final initialPaint = tester.widget<CustomPaint>(orbitFinder);
      final initialPainter = initialPaint.painter as dynamic;
      expect(initialPainter.orbitProgress, equals(0.0));

      await tester.pump(const Duration(milliseconds: 800));
      final midPaint = tester.widget<CustomPaint>(orbitFinder);
      final midPainter = midPaint.painter as dynamic;
      expect(midPainter.orbitProgress, greaterThan(0.2));
      expect(midPainter.orbitProgress, lessThan(0.95));

      await tester.pump(const Duration(milliseconds: 700));
      final endPaint = tester.widget<CustomPaint>(orbitFinder);
      final endPainter = endPaint.painter as dynamic;
      expect(endPainter.orbitProgress, closeTo(1.0, 0.001));
    });

    testWidgets('8. onDone is NOT called prematurely', (tester) async {
      int doneCount = 0;
      await tester.pumpWidget(buildApp(onDone: () => doneCount++));

      await tester.pump(const Duration(milliseconds: 500));
      expect(doneCount, equals(0));

      await tester.pump(const Duration(milliseconds: 1000));
      expect(doneCount, equals(0));

      await tester.pump(const Duration(milliseconds: 800));
      expect(doneCount, equals(0));
    });

    testWidgets('9. onDone is called after splash completion', (tester) async {
      int doneCount = 0;
      await tester.pumpWidget(buildApp(onDone: () => doneCount++));

      await tester.pump(const Duration(milliseconds: 2750));
      expect(doneCount, equals(1));
    });

    testWidgets('10. onDone is called exactly once', (tester) async {
      int doneCount = 0;
      await tester.pumpWidget(buildApp(onDone: () => doneCount++));

      await tester.pump(const Duration(milliseconds: 2750));
      expect(doneCount, equals(1));

      await tester.pump(const Duration(milliseconds: 1000));
      await tester.pump(const Duration(milliseconds: 1000));
      expect(doneCount, equals(1));
    });

    testWidgets('11. Disposing splash before completion does not throw',
        (tester) async {
      int doneCount = 0;
      await tester.pumpWidget(buildApp(onDone: () => doneCount++));
      await tester.pump(const Duration(milliseconds: 500));

      await tester.pumpWidget(const MaterialApp(home: Scaffold(body: Text('Done'))));
      await tester.pumpAndSettle();

      expect(doneCount, equals(0));
      expect(find.text('Done'), findsOneWidget);
    });

    testWidgets('12. No overflow on small phone screen (iPhone SE 375x667)',
        (tester) async {
      await tester.pumpWidget(
        buildApp(size: const Size(375, 667)),
      );
      await tester.pump(const Duration(milliseconds: 1000));
      expect(tester.takeException(), isNull);
    });

    testWidgets('13. Reduced-motion path completes and invokes onDone',
        (tester) async {
      int doneCount = 0;
      await tester.pumpWidget(
        buildApp(
          disableAnimations: true,
          onDone: () => doneCount++,
        ),
      );

      await tester.pump(const Duration(milliseconds: 350));
      expect(doneCount, equals(1));
    });
  });
}
