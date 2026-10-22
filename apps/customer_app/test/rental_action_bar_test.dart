import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/features/listing/widgets/rental_action_bar.dart';
import 'package:customer_app/features/listing/widgets/listing_attributes.dart';
import 'package:customer_app/fixtures/view_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const card = ListingCardView(
    id: 'rental',
    title: 'Garden apartment',
    propertyName: 'Garden',
    areaLabel: 'Lahug',
    cityLabel: 'Cebu City',
    kind: ListingKind.shortTerm,
    resourceType: ResourceType.unit,
    priceCentavos: 200000,
    availabilityLabel: 'Check dates',
    isAvailable: true,
    hasTour: false,
    sceneCount: 0,
    photos: [],
    beds: 2,
    baths: 1,
    sqm: 58,
    propertyType: 'APARTMENT');

void main() {
  Future<void> show(WidgetTester tester,
          {bool monthly = false, AsyncValue<StayQuote>? quote, VoidCallback? onCommit, VoidCallback? onRetry}) =>
      tester.pumpWidget(MaterialApp(
          home: Scaffold(
              body: const Text('Listing content'),
              bottomNavigationBar: RentalActionBar(
                  card: card,
                  isLongTerm: monthly,
                  quote: quote,
                  onCommit: onCommit ?? () {},
                  onSelectDates: () {},
                  onRetryQuote: onRetry ?? () {}))));

  testWidgets('monthly rate stays a monthly rate with one application action', (tester) async {
    final monthly = ListingRepository.toCard({'id': 'monthly', 'kind': 'LONG_TERM', 'priceCentavos': 1800000});
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            bottomNavigationBar: RentalActionBar(
                card: monthly, isLongTerm: true, onCommit: () {}, onSelectDates: () {}, onRetryQuote: () {}))));
    expect(find.text('₱18,000/mo'), findsOneWidget);
    expect(find.text('Long-term rental'), findsOneWidget);
    expect(find.text('Apply to rent'), findsOneWidget);
    expect(find.text('Reserve'), findsNothing);
    expect(find.text('Message'), findsNothing);
  });
  testWidgets('nightly pricing appears once in the sticky footer with no Message action', (tester) async {
    await show(tester);
    expect(find.text('₱2,000/night'), findsOneWidget);
    expect(find.text('Select dates'), findsOneWidget);
    expect(find.text('Reserve'), findsOneWidget);
    expect(find.text('Message'), findsNothing);
    expect(tester.getTopLeft(find.text('₱2,000/night')).dy, greaterThan(450));
  });
  testWidgets('uses the authoritative total including fees instead of multiplying the nightly rate', (tester) async {
    var commits = 0;
    await show(tester,
        quote: const AsyncData(StayQuote(
            nights: 3, guests: 2, nightlyCentavos: 200000, lines: [], totalCentavos: 675000, available: true)),
        onCommit: () => commits++);
    expect(find.text('₱6,750'), findsOneWidget);
    expect(find.text('Total for 3 nights'), findsOneWidget);
    expect(find.text('₱6,000'), findsNothing);
    await tester.tap(find.text('Reserve'));
    expect(commits, 1);
  });
  testWidgets('loading and offline quotes cannot reserve and retry remains available', (tester) async {
    await show(tester, quote: const AsyncLoading());
    expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed, isNull);
    var retries = 0;
    await show(tester,
        quote: const AsyncError(ApiException('You are offline.'), StackTrace.empty), onRetry: () => retries++);
    expect(find.text('You are offline.'), findsOneWidget);
    expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed, isNull);
    await tester.tap(find.text('Retry'));
    expect(retries, 1);
  });
  testWidgets('compact facts use beds, bath, area and property type, omitting unknown facts', (tester) async {
    await tester.pumpWidget(const MaterialApp(
        home: Scaffold(body: ListingAttributeStrip(card: card, detailLayout: true, amenities: ['Garden view']))));
    for (final fact in ['2 Beds', '1 Bath', '58 sqm', 'Apartment', 'Garden view']) {
      expect(find.text(fact), findsOneWidget);
    }
    expect(find.textContaining('Guest'), findsNothing);
  });
  testWidgets('footer remains usable with larger text and narrow screens', (tester) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(MaterialApp(
        builder: (context, child) =>
            MediaQuery(data: MediaQuery.of(context).copyWith(textScaler: const TextScaler.linear(2)), child: child!),
        home: Scaffold(
            bottomNavigationBar: RentalActionBar(
                card: card, isLongTerm: false, onCommit: () {}, onSelectDates: () {}, onRetryQuote: () {}))));
    expect(tester.takeException(), isNull);
  });
}
