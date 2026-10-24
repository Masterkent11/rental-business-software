import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:customer_app/data/account_repository.dart';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/notification_repository.dart';
import 'package:customer_app/data/tenant_home_repository.dart';
import 'package:customer_app/design/glass_bottom_nav.dart';
import 'package:customer_app/design/theme.dart';
import 'package:customer_app/features/my_home/my_home_screen.dart';
import 'package:customer_app/features/my_home/tenancy_detail_screen.dart';
import 'package:customer_app/features/my_home/widgets/home_cards.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'support/tenant_home_fixture.dart';

class _PhotoClient implements HttpClient {
  _PhotoClient(this.bytes);
  final List<int> bytes;
  @override
  Future<HttpClientRequest> getUrl(Uri url) async => _PhotoRequest(bytes);
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _PhotoRequest implements HttpClientRequest {
  _PhotoRequest(this.bytes);
  final List<int> bytes;
  @override
  Future<HttpClientResponse> close() async => _PhotoResponse(bytes);
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _PhotoResponse extends Stream<List<int>> implements HttpClientResponse {
  _PhotoResponse(this.bytes);
  final List<int> bytes;
  @override
  int get statusCode => 200;
  @override
  int get contentLength => bytes.length;
  @override
  HttpClientResponseCompressionState get compressionState => HttpClientResponseCompressionState.notCompressed;
  @override
  StreamSubscription<List<int>> listen(void Function(List<int>)? onData,
          {Function? onError, void Function()? onDone, bool? cancelOnError}) =>
      Stream.value(bytes).listen(onData, onError: onError, onDone: onDone, cancelOnError: cancelOnError);
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<void> mount(WidgetTester tester, Widget child, {Size size = const Size(390, 844), double textScale = 1}) async {
  if (const bool.fromEnvironment('CAPTURE_MY_HOME')) {
    final bytes = File('assets/images/categories/condo.jpg').readAsBytesSync();
    debugNetworkImageHttpClientProvider = () => _PhotoClient(bytes);
  }
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
  await tester.pumpWidget(ProviderScope(
      overrides: [
        accountProvider.overrideWith((ref) async => null),
        unreadNotificationsProvider.overrideWithValue(0),
        selectedTenancyProvider.overrideWith(() => _Selection()),
        tenancyDetailsProvider('home').overrideWith((ref) async => homeFixture()),
      ],
      child: MaterialApp(
          theme: const bool.fromEnvironment('CAPTURE_MY_HOME')
              ? AppTheme.light().copyWith(
                  textTheme: AppTheme.light().textTheme.apply(fontFamily: 'Roboto'),
                  filledButtonTheme: FilledButtonThemeData(
                      style: FilledButton.styleFrom(textStyle: const TextStyle(fontFamily: 'Roboto', fontSize: 15))),
                  textButtonTheme: TextButtonThemeData(
                      style: TextButton.styleFrom(textStyle: const TextStyle(fontFamily: 'Roboto', fontSize: 15))))
              : AppTheme.light(),
          home: MediaQuery(
              data: MediaQueryData(size: size, textScaler: TextScaler.linear(textScale)),
              child: RepaintBoundary(
                  key: const ValueKey('capture'),
                  child: Scaffold(
                      body: child,
                      bottomNavigationBar: GlassBottomNav(tenantMode: true, selectedIndex: 2, onSelected: (_) {})))))));
  await tester.pumpAndSettle();
  if (const bool.fromEnvironment('CAPTURE_MY_HOME')) {
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 150)));
    await tester.pumpAndSettle();
  }
  debugNetworkImageHttpClientProvider = null;
}

class _Selection extends SelectedTenancy {
  @override
  Future<String?> build() async => 'home';
}

Future<void> capture(WidgetTester tester, String name) async {
  if (!const bool.fromEnvironment('CAPTURE_MY_HOME')) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(find.byKey(const ValueKey('capture')));
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = File('build/my_home_visual/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
}

void main() {
  setUpAll(() async {
    if (!const bool.fromEnvironment('CAPTURE_MY_HOME')) return;
    final sdk = Platform.environment['FLUTTER_ROOT'] ?? Platform.resolvedExecutable.split('/bin/cache/').first;
    for (final family in ['Roboto', 'Ahem']) {
      final loader = FontLoader(family);
      for (final weight in ['Regular', 'Medium', 'Bold']) {
        loader.addFont(Future.value(ByteData.sublistView(
            File('$sdk/bin/cache/artifacts/material_fonts/Roboto-$weight.ttf').readAsBytesSync())));
      }
      await loader.load();
    }
    final icons = FontLoader('MaterialIcons')
      ..addFont(Future.value(ByteData.sublistView(
          File('$sdk/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf').readAsBytesSync())));
    await icons.load();
    final systemFont = File('/System/Library/Fonts/SFNS.ttf');
    if (systemFont.existsSync()) {
      for (final family in [
        'SF Pro Text',
        'SF Pro Display',
        '.SF UI Text',
        '.SF UI Display',
        'CupertinoSystemText',
        'CupertinoSystemDisplay',
        '.SF Pro Text',
        '.SF Pro Display'
      ]) {
        await (FontLoader(family)..addFont(Future.value(ByteData.sublistView(systemFont.readAsBytesSync())))).load();
      }
    }
  });
  for (final width in [320.0, 390.0, 430.0]) {
    testWidgets('dashboard has four actions and accessible scrolling at $width', (tester) async {
      await mount(tester, MyHomeScreen(homes: [homeFixture()]), size: Size(width, 900));
      expect(find.text('YOUR SPACE'), findsOneWidget);
      expect(find.text('Explore'), findsOneWidget);
      expect(find.text('My Home'), findsNWidgets(2));
      await tester.scrollUntilVisible(find.text('Lease Documents'), 180, scrollable: find.byType(Scrollable).first);
      expect(find.byType(HomeActionCard), findsNWidgets(4));
      expect(find.text('Active Rental'), findsNothing);
      expect(find.byType(LinearProgressIndicator), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }
  testWidgets('large text retains all actions without overflow', (tester) async {
    await mount(tester, MyHomeScreen(homes: [homeFixture()]), textScale: 1.8);
    await tester.scrollUntilVisible(find.text('Lease Documents'), 180, scrollable: find.byType(Scrollable).first);
    expect(tester.takeException(), isNull);
  });
  testWidgets('details tabs, gallery and rules operate on authorized data', (tester) async {
    await mount(tester, const TenancyDetailScreen(tenancyId: 'home'));
    await tester.tap(find.text('Amenities'));
    await tester.pumpAndSettle();
    expect(find.text('Swimming Pool'), findsOneWidget);
    await tester.tap(find.text('More'));
    await tester.pumpAndSettle();
    expect(find.text('WiFi'), findsOneWidget);
    await tester.tap(find.text('Location'));
    await tester.pumpAndSettle();
    expect(find.text('Map coordinates are not available.'), findsOneWidget);
    await tester.tap(find.text('Photos'));
    await tester.pumpAndSettle();
    expect(find.text('Photos'), findsNWidgets(2));
    await tester.tap(find.byKey(const ValueKey('tenancy-photo-0')));
    await tester.pumpAndSettle();
    expect(find.text('Property photos'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Overview'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('View Rules & Guidelines'), 250,
        scrollable: find.byType(Scrollable).first);
    await tester.tap(find.text('View Rules & Guidelines'));
    await tester.pumpAndSettle();
    expect(find.text('Quiet hours after 10 PM'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('hero opens the private tenancy route and invoices show the real obligation', (tester) async {
    final router = GoRouter(routes: [
      GoRoute(path: '/', builder: (_, __) => MyHomeScreen(homes: [homeFixture()])),
      GoRoute(
          path: '/bookings/home/:id',
          builder: (_, state) => Scaffold(body: Text('Private tenancy ${state.pathParameters['id']}'))),
    ]);
    addTearDown(router.dispose);
    await tester.pumpWidget(ProviderScope(overrides: [
      accountProvider.overrideWith((ref) async => null),
      selectedTenancyProvider.overrideWith(() => _Selection()),
      unreadNotificationsProvider.overrideWithValue(0),
    ], child: MaterialApp.router(routerConfig: router, theme: AppTheme.light())));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(ActiveRentalHeroCard));
    await tester.pumpAndSettle();
    expect(find.text('Private tenancy home'), findsOneWidget);
    router.pop();
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('View invoice'), 250, scrollable: find.byType(Scrollable).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('View invoice'));
    await tester.pumpAndSettle();
    expect(find.text('Invoice #12'), findsOneWidget);
    expect(find.text('Outstanding: ₱25,000'), findsOneWidget);
    expect(find.text('Pay Rent'), findsNothing);
    expect(tester.takeException(), isNull);
  });
  testWidgets('dashboard and details reference viewport captures', (tester) async {
    await mount(tester, MyHomeScreen(homes: [homeFixture()]), size: const Size(390, 1230));
    await capture(tester, 'my_home');
    await mount(tester, const TenancyDetailScreen(tenancyId: 'home'), size: const Size(390, 1430));
    await capture(tester, 'tenancy_details');
    expect(tester.takeException(), isNull);
  });
  testWidgets('details denial provides retry and does not show tenant actions', (tester) async {
    await tester.pumpWidget(ProviderScope(overrides: [
      tenancyDetailsProvider('foreign')
          .overrideWith((ref) async => throw const ApiException('Not available', statusCode: 404))
    ], child: const MaterialApp(home: TenancyDetailScreen(tenancyId: 'foreign'))));
    await tester.pumpAndSettle();
    expect(find.text('Not available'), findsOneWidget);
    expect(find.text('Your tenancy'), findsNothing);
  });
  testWidgets('tenancy details remain scrollable at narrow width with large text', (tester) async {
    await mount(tester, const TenancyDetailScreen(tenancyId: 'home'), size: const Size(320, 900), textScale: 1.8);
    await tester.scrollUntilVisible(find.text('View Rules & Guidelines'), 250,
        scrollable: find.byType(Scrollable).first);
    await tester.pumpAndSettle();
    expect(find.text('View Rules & Guidelines'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
