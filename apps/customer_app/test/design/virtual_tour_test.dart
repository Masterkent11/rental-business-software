import 'package:customer_app/design/home_assets.dart';
import 'package:customer_app/design/virtual_tour_action.dart';
import 'package:customer_app/design/virtual_tour_icon.dart';
import 'package:customer_app/features/discovery/widgets/listing_card.dart';
import 'package:customer_app/features/discovery/widgets/property_card.dart';
import 'package:customer_app/fixtures/view_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  ListingCardView buildListing({required bool hasTour}) {
    return ListingCardView(
      id: 'test-1',
      title: 'Sample Place',
      propertyName: 'Sample Building',
      areaLabel: 'Downtown',
      cityLabel: 'City',
      kind: ListingKind.longTerm,
      resourceType: ResourceType.unit,
      priceCentavos: 100000,
      availabilityLabel: 'Available now',
      isAvailable: true,
      hasTour: hasTour,
      sceneCount: 3,
      isFeatured: false,
      photos: const ['https://example.com/photo.jpg'],
      moveInCost: const MoveInCostView(
        lines: [],
        totalCentavos: 100000,
      ),
    );
  }

  group('VirtualTourIcon', () {
    testWidgets('renders canonical SVG with default size and primaryNavy color', (tester) async {
      await tester.pumpWidget(
        const Directionality(
          textDirection: TextDirection.ltr,
          child: VirtualTourIcon(),
        ),
      );

      final svgFinder = find.byType(SvgPicture);
      expect(svgFinder, findsOneWidget);

      final svg = tester.widget<SvgPicture>(svgFinder);
      expect(svg.width, 16);
      expect(svg.height, 16);
      expect(svg.excludeFromSemantics, isTrue);

      final loader = svg.bytesLoader as SvgAssetLoader;
      expect(loader.assetName, HomeAssets.tour360Svg);
    });

    testWidgets('renders canonical SVG with custom size and color', (tester) async {
      await tester.pumpWidget(
        const Directionality(
          textDirection: TextDirection.ltr,
          child: VirtualTourIcon(
            size: 24,
            color: Colors.red,
          ),
        ),
      );

      final svgFinder = find.byType(SvgPicture);
      final svg = tester.widget<SvgPicture>(svgFinder);
      expect(svg.width, 24);
      expect(svg.height, 24);
    });
  });

  group('VirtualTourAction', () {
    testWidgets('renders light variant with title and handles tap', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: VirtualTourAction(
              title: 'Explore in 360°',
              variant: VirtualTourActionVariant.light,
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Explore in 360°'), findsOneWidget);
      expect(find.byType(VirtualTourIcon), findsOneWidget);

      await tester.tap(find.byType(VirtualTourAction));
      await tester.pump();
      expect(tapped, isTrue);

      expect(
        tester.getSemantics(find.byType(VirtualTourAction)),
        matchesSemantics(
          isButton: true,
          label: 'Explore in 360°',
          hasTapAction: true,
        ),
      );
    });

    testWidgets('renders dark variant with title and handles tap', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: VirtualTourAction(
              title: '360° tour',
              variant: VirtualTourActionVariant.dark,
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('360° tour'), findsOneWidget);
      expect(find.byType(VirtualTourIcon), findsOneWidget);

      await tester.tap(find.byType(VirtualTourAction));
      await tester.pump();
      expect(tapped, isTrue);

      expect(
        tester.getSemantics(find.byType(VirtualTourAction)),
        matchesSemantics(
          isButton: true,
          label: '360° tour',
          hasTapAction: true,
        ),
      );
    });
  });

  group('PropertyCard integration', () {
    testWidgets('displays VirtualTourAction when listing has tour', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: PropertyCard(
                  listing: buildListing(hasTour: true),
                  onTap: () => tapped = true,
                ),
              ),
            ),
          ),
        ),
      );

      final actionFinder = find.byType(VirtualTourAction);
      expect(actionFinder, findsOneWidget);

      final action = tester.widget<VirtualTourAction>(actionFinder);
      expect(action.title, '360°\u200b Tour');
      expect(action.variant, VirtualTourActionVariant.dark);

      await tester.tap(actionFinder);
      await tester.pump();
      expect(tapped, isTrue);
    });

    testWidgets('does not display VirtualTourAction when listing has no tour', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: PropertyCard(
                  listing: buildListing(hasTour: false),
                  onTap: () {},
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.byType(VirtualTourAction), findsNothing);
    });
  });

  group('ListingCard integration', () {
    testWidgets('displays VirtualTourAction when listing has tour', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: ListingCard(
                  listing: buildListing(hasTour: true),
                  onTap: () => tapped = true,
                ),
              ),
            ),
          ),
        ),
      );

      final actionFinder = find.byType(VirtualTourAction);
      expect(actionFinder, findsOneWidget);

      final action = tester.widget<VirtualTourAction>(actionFinder);
      expect(action.title, '360°\u200b Tour');
      expect(action.variant, VirtualTourActionVariant.dark);

      await tester.tap(actionFinder);
      await tester.pump();
      expect(tapped, isTrue);
    });

    testWidgets('does not display VirtualTourAction when listing has no tour', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: SingleChildScrollView(
                child: ListingCard(
                  listing: buildListing(hasTour: false),
                  onTap: () {},
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.byType(VirtualTourAction), findsNothing);
    });
  });
}
