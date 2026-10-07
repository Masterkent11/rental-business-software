import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_bootstrap_state.dart';

export 'app_bootstrap_error_view.dart';
export 'app_bootstrap_state.dart';

class AppBootstrap {
  AppBootstrap({
    String? supabaseUrl,
    String? supabasePublishableKey,
    Future<void> Function({
      required String url,
      required String publishableKey,
    })? initializeSupabase,
    void Function(AppBootstrapState)? onStateChanged,
  })  : _supabaseUrl = supabaseUrl ?? defaultSupabaseUrl,
        _supabasePublishableKey =
            supabasePublishableKey ?? defaultSupabasePublishableKey,
        _initializeSupabase = initializeSupabase ?? _defaultInitSupabase,
        _onStateChanged = onStateChanged;

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
    final AppBootstrap bootstrap =
        customBootstrap ?? ref.read(appBootstrapProvider);
    state = const AppBootstrapState.loading();
    final result = await bootstrap.initialize();
    state = result;
    return result;
  }

  Future<AppBootstrapState> retry([AppBootstrap? customBootstrap]) async {
    final AppBootstrap bootstrap =
        customBootstrap ?? ref.read(appBootstrapProvider);
    state = const AppBootstrapState.loading();
    final result = await bootstrap.retry();
    state = result;
    return result;
  }
}

final appBootstrapStateProvider =
    NotifierProvider<AppBootstrapNotifier, AppBootstrapState>(
      AppBootstrapNotifier.new,
    );
