import 'package:customer_app/app/app.dart';
import 'package:customer_app/design/money.dart';
import 'package:customer_app/features/bookings/widgets/empty_bookings.dart';
import 'package:customer_app/features/discovery/discovery_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Widget tests run with no network, so every remote photo falls through to the
/// tonal placeholder. That is the point of the fallback: the app is fully
/// navigable and fully testable without a single image loading.
///
/// The framework still reports each failed fetch as an unexpected error, so it
/// is filtered here. Only `NetworkImageLoadException` is swallowed — every other
/// error still fails the test.
void _ignoreOfflineImages() {
  final original = FlutterError.onError;
  FlutterError.onError = (details) {
    if (details.exception is NetworkImageLoadException) return;
    original?.call(details);
  };
  addTearDown(() => FlutterError.onError = original);
}

/// Tests run at iPhone 14 size rather than the 800x600 default, so layout
/// assertions mean something about the device the app actually targets.
Future<void> _pumpApp(WidgetTester tester) async {
  _ignoreOfflineImages();

  tester.view
    ..physicalSize = const Size(390, 844)
    ..devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);

  await tester.pumpWidget(const ProviderScope(child: CustomerApp()));
  await tester.pumpAndSettle();
}

void main() {
  group('Money', () {
    test('formats centavos as whole pesos', () {
      expect(Money.peso(850000), '₱8,500');
      expect(Money.peso(3400000), '₱34,000');
      expect(Money.peso(350000), '₱3,500');
    });

    test('keeps centavos when exactness matters', () {
      expect(Money.pesoExact(850050), '₱8,500.50');
    });

    test('carries the price shape of each rental path', () {
      expect(Money.perMonth(850000), '₱8,500/mo');
      expect(Money.perNight(150000), '₱1,500/night');
    });
  });

  group('Discovery filters', () {
    test('narrow results without touching availability', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final all = container.read(resultsProvider).length;

      container.read(filtersProvider.notifier).setTourOnly(true);
      final withTour = container.read(resultsProvider);

      expect(withTour.length, lessThan(all));
      expect(withTour.every((l) => l.hasTour), isTrue);

      container.read(filtersProvider.notifier).clear();
      expect(container.read(resultsProvider).length, all);
    });

    test('a budget filter is a price filter, never a date query', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      container.read(filtersProvider.notifier).setMax(500000);
      final results = container.read(resultsProvider);

      expect(results, isNotEmpty);
      expect(results.every((l) => l.priceCentavos <= 500000), isTrue);
    });
  });

  testWidgets('discovery leads with price and move-in cost', (tester) async {
    await _pumpApp(tester);

    expect(find.text('Find a place'), findsOneWidget);
    // Twice: once in the featured carousel, once in the list below it.
    expect(find.text('₱8,500/mo'), findsWidgets);

    // The number the journey says customers actually need: an ₱8,500 unit
    // costs ₱34,000 to enter.
    expect(find.text('₱34,000 to move in'), findsOneWidget);
  });

  testWidgets('a listing opens its tour and walks between scenes',
      (tester) async {
    await _pumpApp(tester);

    final listingFinder =
        find.text('One-bedroom corner unit with cross-ventilation').first;
    await tester.dragUntilVisible(
      listingFinder,
      find.byType(CustomScrollView).first,
      const Offset(0, -300),
    );
    await tester.tap(listingFinder, warnIfMissed: false);
    await tester.pumpAndSettle();

    expect(find.text('Walk through it'), findsOneWidget);

    await tester.ensureVisible(find.text('Walk through it'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Walk through it'));

    // Hotspots pulse forever by design, so the tour never "settles" — pump
    // fixed frames instead of waiting for stillness.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.text('Virtual Tour'), findsOneWidget);
    expect(find.text('Living room'), findsWidgets);
    expect(find.text('1/5'), findsOneWidget);

    // A navigation hotspot carries its destination, and tapping it walks there.
    await tester.tap(find.text('Kitchen').first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.text('2/5'), findsOneWidget);
  });

  testWidgets('long-term goes to apply, nightly goes to dates',
      (tester) async {
    await _pumpApp(tester);

    final listingFinder =
        find.text('One-bedroom corner unit with cross-ventilation').first;
    await tester.dragUntilVisible(
      listingFinder,
      find.byType(CustomScrollView).first,
      const Offset(0, -300),
    );
    await tester.tap(listingFinder, warnIfMissed: false);
    await tester.pumpAndSettle();
    expect(find.text('Apply to rent'), findsOneWidget);

    await tester.tap(find.text('Apply to rent'));
    await tester.pumpAndSettle();

    // Nothing is submittable until a document is attached.
    expect(find.text('Attach at least one document'), findsOneWidget);

    // Applying does not reserve the place, and the screen says so out loud.
    final notice = find.textContaining('does not reserve');
    await tester.scrollUntilVisible(notice, 200);
    expect(notice, findsOneWidget);
  });

  testWidgets('a photo-only listing offers no tour', (tester) async {
    await _pumpApp(tester);

    final parking = find.text('Covered parking slot, 24/7 access');
    await tester.dragUntilVisible(
      parking,
      find.byType(CustomScrollView).first,
      const Offset(0, -400),
    );
    await tester.pumpAndSettle();

    await tester.tap(parking);
    await tester.pumpAndSettle();

    expect(find.text('Walk through it'), findsNothing);
    expect(find.text('₱2,000/mo'), findsOneWidget);
  });

  testWidgets('an unavailable listing cannot be committed to', (tester) async {
    await _pumpApp(tester);

    final room = find.text('Private room with own CR');
    await tester.dragUntilVisible(
      room,
      find.byType(CustomScrollView).first,
      const Offset(0, -400),
    );
    await tester.pumpAndSettle();

    await tester.tap(room);
    await tester.pumpAndSettle();

    expect(find.text('Fully occupied'), findsWidgets);

    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Not available'),
    );
    expect(button.onPressed, isNull);
  });

  testWidgets('the featured row changes with the lens', (tester) async {
    await _pumpApp(tester);

    expect(find.text('Worth a walkthrough'), findsOneWidget);

    await tester.tap(find.text('Nearby'));
    await tester.pumpAndSettle();
    expect(find.text('Close to you'), findsOneWidget);

    // "Recommendation" is long enough to sit past the right edge on a 390pt
    // screen, so the row scrolls to it first — as a thumb would.
    await tester.ensureVisible(find.text('Recommendation'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Recommendation'));
    await tester.pumpAndSettle();
    expect(find.text('Picked for you'), findsOneWidget);
  });

  testWidgets('the header opens notifications and messages', (tester) async {
    await _pumpApp(tester);

    await tester.tap(find.bySemanticsLabel(RegExp('Notifications')));
    await tester.pumpAndSettle();
    expect(find.text('Your booking is confirmed'), findsOneWidget);

    // pageBack() looks for a Cupertino back button; these screens use their own
    // leading icon, so pop directly.
    await tester.tap(find.byIcon(Icons.arrow_back_ios_new));
    await tester.pumpAndSettle();

    await tester.tap(find.bySemanticsLabel(RegExp('Messages')));
    await tester.pumpAndSettle();
    expect(find.textContaining('not a general chat'), findsOneWidget);
  });

  testWidgets('bookings list stays, and empty tabs offer a way out',
      (tester) async {
    await _pumpApp(tester);

    await tester.tap(find.byIcon(Icons.confirmation_number_outlined));
    await tester.pumpAndSettle();

    // Active has one confirmed stay.
    expect(find.text('Confirmed'), findsOneWidget);
    expect(find.text('₱4,500'), findsOneWidget);

    await tester.tap(find.text('Past'));
    await tester.pumpAndSettle();
    expect(find.text('Completed'), findsWidgets);

    // Cancelled is genuinely empty — illustration, explanation, and a CTA that
    // goes somewhere rather than a dead end.
    await tester.tap(find.text('Cancelled'));
    await tester.pumpAndSettle();
    expect(find.text('Nothing cancelled'), findsOneWidget);
    expect(find.byType(EmptyBookingsArt), findsOneWidget);

    await tester.tap(find.text('Find a place to stay'));
    await tester.pumpAndSettle();
    expect(find.text('Find a place'), findsOneWidget);
  });

  testWidgets('a booking opens its detail, with dates and what was paid',
      (tester) async {
    await _pumpApp(tester);

    await tester.tap(find.byIcon(Icons.confirmation_number_outlined));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Condo stay, walking distance to IT Park'));
    await tester.pumpAndSettle();

    expect(find.text('CHECK-IN'), findsOneWidget);
    expect(find.text('CHECK-OUT'), findsOneWidget);
    expect(find.text('3 nights · 2 guests'), findsOneWidget);

    // Prepaid in full, and no deposit — a stay settles nothing at checkout.
    final prepaid = find.textContaining('no deposit');
    await tester.scrollUntilVisible(prepaid, 250);
    expect(prepaid, findsOneWidget);
  });

  testWidgets('applications track their outcome, and a rejection explains itself',
      (tester) async {
    await _pumpApp(tester);

    await tester.tap(find.byIcon(Icons.person_outline));
    await tester.pumpAndSettle();

    await tester.tap(find.text('My applications'));
    await tester.pumpAndSettle();

    // Waiting: applying reserves nothing, and the card says so.
    expect(find.textContaining('does not reserve the place'), findsOneWidget);

    // Approved: the hold expires, so the deadline is the message.
    expect(find.text('You have been approved'), findsOneWidget);
    expect(find.textContaining('held for you until'), findsOneWidget);

    // Rejected: a reason, and the documents survive.
    final rejected = find.textContaining('accepted an application submitted');
    await tester.scrollUntilVisible(rejected, 250);
    expect(rejected, findsOneWidget);
    expect(find.textContaining('still on file'), findsOneWidget);
  });
}
