import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../app_config.dart';
import 'app_bootstrap_state.dart';

export '../app_config.dart' show AppConfigurationError;

export 'app_bootstrap_error_view.dart';
export 'app_bootstrap_state.dart';

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

  static const configuredApiBaseUrl = AppConfig.configuredApiBaseUrl;
  static const configuredAppEnv = AppConfig.configuredAppEnv;

  static String? configurationProblem({
    required bool release,
    required String apiBaseUrl,
    required String supabaseUrl,
    required String supabasePublishableKey,
    String? appEnv,
  }) {
    try {
      AppConfig.parse(
        appEnv: appEnv ?? (release ? 'production' : 'development'),
        apiBaseUrl: apiBaseUrl,
        supabaseUrl: supabaseUrl,
        supabasePublishableKey: supabasePublishableKey,
        release: release,
      );
      return null;
    } on AppConfigurationError catch (error) {
      return error.message;
    }
  }

  static const defaultSupabaseUrl = AppConfig.configuredSupabaseUrl;
  static const defaultSupabasePublishableKey = AppConfig.configuredSupabaseKey;

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

    final resolvedEnv = _appEnv;

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
  return AppBootstrap(
    initializeSupabase: ({required url, required publishableKey}) async {
      AppConfig.fromBuild();
      await AppBootstrap._defaultInitSupabase(url: url, publishableKey: publishableKey);
    },
  );
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
