import 'dart:async';

import 'package:customer_app/app/app.dart';
import 'package:customer_app/app/bootstrap/app_bootstrap.dart';
import 'package:customer_app/data/api_client.dart';
import 'package:customer_app/data/auth_repository.dart';
import 'package:customer_app/data/listing_repository.dart';
import 'package:customer_app/features/launch/splash_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'support/fake_auth.dart';

void main() {
  group('release configuration', () {
    test('a debug build may use the local API', () {
      expect(
        AppBootstrap.configurationProblem(
          release: false,
          apiBaseUrl: '',
          supabaseUrl: 'https://x.supabase.co',
          supabasePublishableKey: 'sb_publishable_x',
        ),
        isNull,
      );
    });

    test('a release build without an API address refuses to start', () async {
      var supabaseStarted = false;
      final bootstrap = AppBootstrap(
        release: true,
        apiBaseUrl: '',
        supabaseUrl: 'https://x.supabase.co',
        supabasePublishableKey: 'sb_publishable_x',
        initializeSupabase: ({required url, required publishableKey}) async => supabaseStarted = true,
      );

      final state = await bootstrap.initialize();

      expect(state.hasError, isTrue);
      expect(state.error, isA<AppConfigurationError>());
      expect(supabaseStarted, isFalse);
    });

    test('a release build must use HTTPS', () {
      expect(
        AppBootstrap.configurationProblem(
          release: true,
          apiBaseUrl: 'http://api.example.com',
          supabaseUrl: 'https://x.supabase.co',
          supabasePublishableKey: 'sb_publishable_x',
        ),
        contains('HTTPS'),
      );
    });

    test('a secret key is never accepted in the app', () {
      expect(
        AppBootstrap.configurationProblem(
          release: false,
          apiBaseUrl: '',
          supabaseUrl: 'https://x.supabase.co',
          supabasePublishableKey: 'sb_secret_abc',
        ),
        isNotNull,
      );
    });

    test('a correctly configured release build starts', () async {
      final bootstrap = AppBootstrap(
        release: true,
        apiBaseUrl: 'https://api.example.com',
        supabaseUrl: 'https://x.supabase.co',
        supabasePublishableKey: 'sb_publishable_x',
        initializeSupabase: ({required url, required publishableKey}) async {},
      );

      expect((await bootstrap.initialize()).isReady, isTrue);
    });
  });

  group('AppBootstrapState', () {
    test('idle state values', () {
      const state = AppBootstrapState.idle();
      expect(state.status, equals(BootstrapStatus.idle));
      expect(state.isReady, isFalse);
      expect(state.hasError, isFalse);
      expect(state.isCompleted, isFalse);
      expect(state.error, isNull);
    });

    test('loading state values', () {
      const state = AppBootstrapState.loading();
      expect(state.status, equals(BootstrapStatus.loading));
      expect(state.isReady, isFalse);
      expect(state.hasError, isFalse);
      expect(state.isCompleted, isFalse);
    });

    test('ready state values', () {
      const state = AppBootstrapState.ready();
      expect(state.status, equals(BootstrapStatus.ready));
      expect(state.isReady, isTrue);
      expect(state.hasError, isFalse);
      expect(state.isCompleted, isTrue);
    });

    test('error state values', () {
      final error = Exception('init failed');
      final state = AppBootstrapState.error(error);
      expect(state.status, equals(BootstrapStatus.error));
      expect(state.isReady, isFalse);
      expect(state.hasError, isTrue);
      expect(state.isCompleted, isTrue);
      expect(state.error, equals(error));
    });

    test('equality and hashCode', () {
      const s1 = AppBootstrapState(status: BootstrapStatus.ready);
      const s2 = AppBootstrapState.ready();
      expect(s1, equals(s2));
      expect(s1.hashCode, equals(s2.hashCode));
    });
  });

  group('AppBootstrap', () {
    test('successful initialization transitions to ready', () async {
      final stateHistory = <AppBootstrapState>[];
      final bootstrap = AppBootstrap(
        initializeSupabase: ({required url, required publishableKey}) async {
          expect(url, equals(AppBootstrap.defaultSupabaseUrl));
          expect(
            publishableKey,
            equals(AppBootstrap.defaultSupabasePublishableKey),
          );
        },
        onStateChanged: stateHistory.add,
      );

      expect(bootstrap.state.status, equals(BootstrapStatus.idle));
      final result = await bootstrap.initialize();

      expect(result.isReady, isTrue);
      expect(bootstrap.state.isReady, isTrue);
      expect(
          stateHistory.map((s) => s.status).toList(),
          equals([
            BootstrapStatus.loading,
            BootstrapStatus.ready,
          ]));
    });

    test('subsequent initialize calls return identical future and do not re-run', () async {
      int initCount = 0;
      final bootstrap = AppBootstrap(
        initializeSupabase: ({required url, required publishableKey}) async {
          initCount++;
        },
      );

      final f1 = bootstrap.initialize();
      final f2 = bootstrap.initialize();

      expect(identical(f1, f2), isTrue);
      await f1;
      expect(initCount, equals(1));

      final f3 = bootstrap.initialize();
      await f3;
      expect(initCount, equals(1));
    });

    test('handles initialization failure gracefully', () async {
      final thrownError = StateError('network failed');
      final bootstrap = AppBootstrap(
        initializeSupabase: ({required url, required publishableKey}) async {
          throw thrownError;
        },
      );

      final result = await bootstrap.initialize();
      expect(result.hasError, isTrue);
      expect(result.error, equals(thrownError));
      expect(bootstrap.state.hasError, isTrue);
    });

    test('retry re-attempts initialization and succeeds after failure', () async {
      int attempts = 0;
      final bootstrap = AppBootstrap(
        initializeSupabase: ({required url, required publishableKey}) async {
          attempts++;
          if (attempts == 1) {
            throw StateError('network failed');
          }
        },
      );

      final firstResult = await bootstrap.initialize();
      expect(firstResult.hasError, isTrue);
      expect(bootstrap.state.hasError, isTrue);

      final retryResult = await bootstrap.retry();
      expect(retryResult.isReady, isTrue);
      expect(bootstrap.state.isReady, isTrue);
      expect(attempts, equals(2));
    });
  });

  group('AppBootstrap Riverpod integration', () {
    test('Notifier initializes through provider', () async {
      final bootstrap = AppBootstrap(
        initializeSupabase: ({required url, required publishableKey}) async {},
      );

      final container = ProviderContainer(
        overrides: [appBootstrapProvider.overrideWithValue(bootstrap)],
      );
      addTearDown(container.dispose);

      expect(
        container.read(appBootstrapStateProvider).status,
        equals(BootstrapStatus.idle),
      );

      final result = await container.read(appBootstrapStateProvider.notifier).initialize();

      expect(result.status, equals(BootstrapStatus.ready));
      expect(
        container.read(appBootstrapStateProvider).status,
        equals(BootstrapStatus.ready),
      );
    });

    test('Notifier retry updates state to loading then ready', () async {
      int attempts = 0;
      final bootstrap = AppBootstrap(
        initializeSupabase: ({required url, required publishableKey}) async {
          attempts++;
          if (attempts == 1) {
            throw StateError('fail first');
          }
        },
      );

      final container = ProviderContainer(
        overrides: [appBootstrapProvider.overrideWithValue(bootstrap)],
      );
      addTearDown(container.dispose);

      final firstResult = await container.read(appBootstrapStateProvider.notifier).initialize();
      expect(firstResult.hasError, isTrue);
      expect(container.read(appBootstrapStateProvider).hasError, isTrue);

      final retryResult = await container.read(appBootstrapStateProvider.notifier).retry();
      expect(retryResult.isReady, isTrue);
      expect(container.read(appBootstrapStateProvider).isReady, isTrue);
      expect(attempts, equals(2));
    });

    test('authRepositoryProvider re-evaluates when bootstrap state becomes ready', () async {
      final completer = Completer<void>();
      final bootstrap = AppBootstrap(
        initializeSupabase: ({required url, required publishableKey}) => completer.future,
      );

      final container = ProviderContainer(
        overrides: [appBootstrapProvider.overrideWithValue(bootstrap)],
      );
      addTearDown(container.dispose);

      expect(container.read(authRepositoryProvider), isA<UnavailableAuthGateway>());

      final initFuture = container.read(appBootstrapStateProvider.notifier).initialize(bootstrap);

      expect(
        container.read(appBootstrapStateProvider).status,
        equals(BootstrapStatus.loading),
      );

      completer.complete();
      await initFuture;

      expect(
        container.read(appBootstrapStateProvider).status,
        equals(BootstrapStatus.ready),
      );
    });
  });

  group('CustomerApp Startup and Splash Flow', () {
    void setupScreen(WidgetTester tester) {
      tester.view
        ..physicalSize = const Size(390, 844)
        ..devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      final original = FlutterError.onError;
      FlutterError.onError = (details) {
        if (details.exception is NetworkImageLoadException) return;
        original?.call(details);
      };
      addTearDown(() => FlutterError.onError = original);
    }

    testWidgets('renders SplashScreen immediately on frame 1', (tester) async {
      setupScreen(tester);
      final bootstrapCompleter = Completer<void>();
      final bootstrap = AppBootstrap(
        initializeSupabase: ({required url, required publishableKey}) => bootstrapCompleter.future,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authRepositoryProvider.overrideWithValue(FakeAuth()),
            apiClientProvider.overrideWithValue(_mockClient()),
          ],
          child: CustomerApp(
            showSplash: true,
            bootstrap: bootstrap,
          ),
        ),
      );

      expect(find.byType(SplashScreen), findsOneWidget);

      bootstrapCompleter.complete();
      await tester.pump(const Duration(milliseconds: 100));
    });

    testWidgets('waits for splash animation when bootstrap completes first', (tester) async {
      setupScreen(tester);
      final bootstrap = AppBootstrap(
        initializeSupabase: ({required url, required publishableKey}) async {},
      );

      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(
            size: Size(390, 844),
            disableAnimations: true,
          ),
          child: ProviderScope(
            overrides: [
              authRepositoryProvider.overrideWithValue(FakeAuth()),
              apiClientProvider.overrideWithValue(_mockClient()),
            ],
            child: CustomerApp(
              showSplash: true,
              bootstrap: bootstrap,
            ),
          ),
        ),
      );

      expect(find.byType(SplashScreen), findsOneWidget);

      await tester.pump(const Duration(milliseconds: 350));
      await tester.pumpAndSettle();

      expect(find.byType(SplashScreen), findsNothing);
    });

    testWidgets('waits for bootstrap if splash animation completes first', (tester) async {
      setupScreen(tester);
      final bootstrapCompleter = Completer<void>();
      final bootstrap = AppBootstrap(
        initializeSupabase: ({required url, required publishableKey}) => bootstrapCompleter.future,
      );

      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(
            size: Size(390, 844),
            disableAnimations: true,
          ),
          child: ProviderScope(
            overrides: [
              authRepositoryProvider.overrideWithValue(FakeAuth()),
              apiClientProvider.overrideWithValue(_mockClient()),
            ],
            child: CustomerApp(
              showSplash: true,
              bootstrap: bootstrap,
            ),
          ),
        ),
      );

      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byType(SplashScreen), findsOneWidget);

      bootstrapCompleter.complete();
      await tester.pump();
      await tester.pumpAndSettle();

      expect(find.byType(SplashScreen), findsNothing);
    });

    testWidgets('shows AppBootstrapErrorView when bootstrap fails', (tester) async {
      setupScreen(tester);
      final bootstrap = AppBootstrap(
        initializeSupabase: ({required url, required publishableKey}) async {
          throw StateError('failed to connect');
        },
      );

      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(
            size: Size(390, 844),
            disableAnimations: true,
          ),
          child: ProviderScope(
            overrides: [
              authRepositoryProvider.overrideWithValue(FakeAuth()),
              apiClientProvider.overrideWithValue(_mockClient()),
            ],
            child: CustomerApp(
              showSplash: true,
              bootstrap: bootstrap,
            ),
          ),
        ),
      );

      await tester.pump(const Duration(milliseconds: 350));
      await tester.pumpAndSettle();

      expect(find.byType(SplashScreen), findsNothing);
      expect(find.byType(AppBootstrapErrorView), findsOneWidget);
      expect(find.text('Initialization Failed'), findsOneWidget);
      expect(find.byKey(const ValueKey('bootstrap_retry_button')), findsOneWidget);
    });

    testWidgets('recovers from failure when retry button is pressed', (tester) async {
      setupScreen(tester);
      int attempts = 0;
      final bootstrap = AppBootstrap(
        initializeSupabase: ({required url, required publishableKey}) async {
          attempts++;
          if (attempts == 1) {
            throw StateError('network error');
          }
        },
      );

      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(
            size: Size(390, 844),
            disableAnimations: true,
          ),
          child: ProviderScope(
            overrides: [
              authRepositoryProvider.overrideWithValue(FakeAuth()),
              apiClientProvider.overrideWithValue(_mockClient()),
            ],
            child: CustomerApp(
              showSplash: true,
              bootstrap: bootstrap,
            ),
          ),
        ),
      );

      await tester.pump(const Duration(milliseconds: 350));
      await tester.pumpAndSettle();

      expect(find.byType(AppBootstrapErrorView), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('bootstrap_retry_button')));
      await tester.pump();
      await tester.pumpAndSettle();

      expect(find.byType(AppBootstrapErrorView), findsNothing);
      expect(attempts, equals(2));
    });
  });
}

ApiClient _mockClient() {
  final handler = MockClient((request) async {
    return http.Response('[]', 200, headers: {'content-type': 'application/json'});
  });
  return ApiClient(client: handler);
}
