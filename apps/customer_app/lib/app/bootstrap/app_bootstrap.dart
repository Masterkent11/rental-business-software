import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_bootstrap_state.dart';

export 'app_bootstrap_error_view.dart';
export 'app_bootstrap_state.dart';

class AppConfigurationError implements Exception {
  const AppConfigurationError(this.message);

  final String message;

  @override
  String toString() => message;
}

class AppBootstrap {
  AppBootstrap({
    String? supabaseUrl,
    String? supabasePublishableKey,
    String? apiBaseUrl,
    String? appEnv,
    bool? release,
    Future<void> Function({
      required String url,
      required String publishableKey,
    })? initializeSupabase,
    void Function(AppBootstrapState)? onStateChanged,
  })  : _supabaseUrl = supabaseUrl ?? defaultSupabaseUrl,
        _supabasePublishableKey = supabasePublishableKey ?? defaultSupabasePublishableKey,
        _apiBaseUrl = apiBaseUrl ?? configuredApiBaseUrl,
        _appEnv = appEnv ?? configuredAppEnv,
        _release = release ?? (kReleaseMode || kProfileMode),
        _initializeSupabase = initializeSupabase ?? _defaultInitSupabase,
        _onStateChanged = onStateChanged;

  static const configuredApiBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const configuredAppEnv = String.fromEnvironment('APP_ENV');

  static String? configurationProblem({
    required bool release,
    required String apiBaseUrl,
    required String supabaseUrl,
    required String supabasePublishableKey,
    String? appEnv,
  }) {
    if (supabaseUrl.isEmpty || supabasePublishableKey.isEmpty) {
      return 'This build is missing its Supabase settings.';
    }
    if (supabasePublishableKey.startsWith('sb_secret_') || supabasePublishableKey.contains('service_role')) {
      return 'This build was given a secret key. Only the publishable key may ship in the app.';
    }
    final normalizedEnv = (appEnv ?? '').trim().toLowerCase();
    final isProductionEnv = normalizedEnv == 'production' || normalizedEnv == 'prod';
    final requiresHttps = release || isProductionEnv;
    if (!requiresHttps) return null;
    if (apiBaseUrl.isEmpty) {
      return 'This build has no server address. Rebuild with --dart-define=API_BASE_URL=https://your-api.';
    }
    if (!apiBaseUrl.startsWith('https://') || !supabaseUrl.startsWith('https://')) {
      return 'Release builds must talk to the server over HTTPS.';
    }
    return null;
  }

  static const defaultSupabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://yoscanunnqbzmlnwzift.supabase.co',
  );

  static const defaultSupabasePublishableKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
    defaultValue: 'sb_publishable_kIi6Ltp2MkALYjGHCVeU3g_e5rAJp-q',
  );

  final String _supabaseUrl;
  final String _supabasePublishableKey;
  final String _apiBaseUrl;
  final String _appEnv;
  final bool _release;
  final Future<void> Function({
    required String url,
    required String publishableKey,
  }) _initializeSupabase;
  final void Function(AppBootstrapState)? _onStateChanged;

  AppBootstrapState _state = const AppBootstrapState.idle();
  AppBootstrapState get state => _state;

  Future<AppBootstrapState>? _initFuture;

  static Future<void> _defaultInitSupabase({
    required String url,
    required String publishableKey,
  }) async {
    try {
      Supabase.instance;
      return;
    } catch (_) {}

    await Supabase.initialize(
      url: url,
      publishableKey: publishableKey,
    );
  }

  void _setState(AppBootstrapState next) {
    _state = next;
    _onStateChanged?.call(next);
  }

  Future<AppBootstrapState> initialize() {
    _initFuture ??= _doInitialize();
    return _initFuture!;
  }

  Future<AppBootstrapState> _doInitialize() async {
    if (_state.isReady) {
      return _state;
    }

    _setState(const AppBootstrapState.loading());

    final resolvedEnv = _appEnv.isNotEmpty
        ? _appEnv
        : (_release ? 'production' : 'development');

    if (kDebugMode) {
      final uri = Uri.tryParse(_apiBaseUrl);
      debugPrint('mode=debug');
      debugPrint('env=$resolvedEnv');
      debugPrint('apiScheme=${uri?.scheme ?? ""}');
      debugPrint('apiHost=${uri?.host ?? ""}');
      debugPrint('apiPort=${uri != null && uri.hasPort ? uri.port.toString() : ""}');
    }

    final problem = configurationProblem(
      release: _release,
      apiBaseUrl: _apiBaseUrl,
      supabaseUrl: _supabaseUrl,
      supabasePublishableKey: _supabasePublishableKey,
      appEnv: resolvedEnv,
    );
    if (problem != null) {
      _initFuture = null;
      _setState(AppBootstrapState.error(AppConfigurationError(problem)));
      return _state;
    }

    try {
      await _initializeSupabase(
        url: _supabaseUrl,
        publishableKey: _supabasePublishableKey,
      );
      _setState(const AppBootstrapState.ready());
    } catch (e) {
      _initFuture = null;
      _setState(AppBootstrapState.error(e));
    }

    return _state;
  }

  Future<AppBootstrapState> retry() {
    _initFuture = null;
    _state = const AppBootstrapState.idle();
    return initialize();
  }
}

final appBootstrapProvider = Provider<AppBootstrap>((ref) {
  return AppBootstrap();
});

class AppBootstrapNotifier extends Notifier<AppBootstrapState> {
  @override
  AppBootstrapState build() {
    return const AppBootstrapState.idle();
  }

  Future<AppBootstrapState> initialize([AppBootstrap? customBootstrap]) async {
    final AppBootstrap bootstrap = customBootstrap ?? ref.read(appBootstrapProvider);
    state = const AppBootstrapState.loading();
    final result = await bootstrap.initialize();
    state = result;
    return result;
  }

  Future<AppBootstrapState> retry([AppBootstrap? customBootstrap]) async {
    final AppBootstrap bootstrap = customBootstrap ?? ref.read(appBootstrapProvider);
    state = const AppBootstrapState.loading();
    final result = await bootstrap.retry();
    state = result;
    return result;
  }
}

final appBootstrapStateProvider = NotifierProvider<AppBootstrapNotifier, AppBootstrapState>(
  AppBootstrapNotifier.new,
);
