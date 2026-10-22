import 'package:customer_app/data/listing_repository.dart';
import 'dart:async';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/application_repository.dart';
import 'package:customer_app/data/verification_repository.dart';
import 'package:customer_app/features/application/application_controller.dart';
import 'package:customer_app/features/application/application_flow_view.dart';
import 'package:customer_app/features/application/domain/verification.dart';
import 'package:customer_app/features/application/verification_panel.dart';
import 'package:customer_app/fixtures/view_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'verification_flow_test.dart' show MemoryVerification;

const applicationCard = ListingCardView(
    id: 'l1',
    resourceId: 'r1',
    title: 'Two-bedroom garden apartment',
    propertyName: 'Garden',
    areaLabel: 'Lahug',
    cityLabel: 'Cebu City',
    kind: ListingKind.longTerm,
    resourceType: ResourceType.unit,
    priceCentavos: 1800000,
    availabilityLabel: 'Available',
    isAvailable: true,
    hasTour: false,
    sceneCount: 0,
    photos: []);

void main() {
  testWidgets('consent is required before entering the camera', (tester) async {
    final server = MemoryVerification()..serverStatus = VerificationStatus.consentRequired;
    final api = ApiClient(baseUrl: 'http://test');
    addTearDown(api.close);
    final controller =
        ApplicationFlowController(server, ApplicationRepository(api), 'r1', () => DateTime(2026, 10, 21));
    addTearDown(controller.dispose);
    await tester.runAsync(() => Future<void>.delayed(Duration.zero));
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: SingleChildScrollView(
                child: VerificationPanel(
                    state: ApplicationFlowState(
                        moveIn: DateTime(2026, 11, 1), session: server.session(VerificationStatus.consentRequired)),
                    controller: controller)))));
    final action = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Continue to camera'));
    expect(action.onPressed, isNull);
    await tester.tap(find.byType(CheckboxListTile));
    await tester.pump();
    expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Continue to camera')).onPressed, isNotNull);
  });
  testWidgets('success appears only for the server verified state and continues to review', (tester) async {
    final server = MemoryVerification();
    final api = ApiClient(baseUrl: 'http://test');
    addTearDown(api.close);
    final controller =
        ApplicationFlowController(server, ApplicationRepository(api), 'r1', () => DateTime(2026, 10, 21));
    addTearDown(controller.dispose);
    await tester.runAsync(() => Future<void>.delayed(Duration.zero));
    Future<void> show(VerificationStatus status) => tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: VerificationPanel(
                state: ApplicationFlowState(moveIn: DateTime(2026, 11, 1), session: server.session(status)),
                controller: controller))));
    await show(VerificationStatus.verifying);
    expect(find.text('Identity verified'), findsNothing);
    await show(VerificationStatus.verified);
    expect(find.text('Identity verified'), findsOneWidget);
    expect(find.text('Review application'), findsNothing);
    expect(find.text('Submit application to owner'), findsNothing);
  });
  testWidgets('application details fit a small screen with larger text', (tester) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final server = MemoryVerification();
    await tester.pumpWidget(ProviderScope(
        overrides: [verificationRepositoryProvider.overrideWithValue(server)],
        child: MaterialApp(
            builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context).copyWith(textScaler: const TextScaler.linear(2)), child: child!),
            home: const ApplicationFlowView(card: applicationCard))));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Continue'), 400, scrollable: find.byType(Scrollable).first);
    expect(find.text('Continue'), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.byType(DropdownButtonFormField<int>), findsOneWidget);
    expect(find.byType(TextFormField), findsNothing);
    expect(find.textContaining('does not reserve'), findsNothing);
    expect(find.text('Verify your identity'), findsNothing);
    expect(tester.takeException(), isNull);
  });
  testWidgets('Step 1 remains minimal while Continue initializes verification', (tester) async {
    final server = MemoryVerification()
      ..serverStatus = VerificationStatus.consentRequired
      ..saveGate = Completer<ApplicationDraft>();
    await tester.pumpWidget(ProviderScope(
        overrides: [verificationRepositoryProvider.overrideWithValue(server)],
        child: const MaterialApp(home: ApplicationFlowView(card: applicationCard))));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue'));
    await tester.pump();
    expect(find.byType(LinearProgressIndicator), findsNothing);
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Continue')).onPressed, isNull);
    expect(find.text('Rental term'), findsOneWidget);
    expect(find.textContaining('Message to owner'), findsNothing);
    expect(find.textContaining('does not reserve'), findsNothing);
    expect(find.text('When do you want to move in?'), findsOneWidget);
    server.saveGate!.complete(server.draft!);
    await tester.pumpAndSettle();
    expect(find.text('Continue to camera'), findsOneWidget);
    expect(find.text('Submit application to owner'), findsNothing);
  });
  testWidgets('manual review never shows success and only permits configured pending submission', (tester) async {
    final server = MemoryVerification()..serverStatus = VerificationStatus.manualReview;
    final api = ApiClient(baseUrl: 'http://test');
    addTearDown(api.close);
    final controller =
        ApplicationFlowController(server, ApplicationRepository(api), 'r1', () => DateTime(2026, 10, 21));
    addTearDown(controller.dispose);
    await tester.runAsync(() => Future<void>.delayed(Duration.zero));
    await controller.continueToVerification();
    controller.reviewPendingApplication();
    expect(controller.state.step, ApplicationStep.verification);
    await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: VerificationPanel(state: controller.state, controller: controller))));
    expect(find.text('Identity pending review'), findsOneWidget);
    expect(find.text('Identity verified'), findsNothing);
    expect(find.text('Review application'), findsNothing);
    controller.configureListing(ListingRepository.toCard(
        {'id': 'l1', 'resourceId': 'r1', 'kind': 'LONG_TERM', 'allowPendingIdentityApplication': true}));
    await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: VerificationPanel(state: controller.state, controller: controller))));
    expect(find.text('Review application'), findsOneWidget);
    await tester.tap(find.text('Review application'));
    expect(controller.state.step, ApplicationStep.review);
  });
}
