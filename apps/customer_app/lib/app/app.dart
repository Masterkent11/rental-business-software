import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../design/theme.dart';
import '../design/tokens.dart';
import '../features/launch/splash_screen.dart';
import 'bootstrap/app_bootstrap.dart';
import 'router.dart';

class CustomerApp extends ConsumerStatefulWidget {
  const CustomerApp({
    this.showSplash = true,
    this.bootstrap,
    super.key,
  });

  final bool showSplash;
  final AppBootstrap? bootstrap;

  @override
  ConsumerState<CustomerApp> createState() => _CustomerAppState();
}

class _CustomerAppState extends ConsumerState<CustomerApp> {
  late final GoRouter _router = buildRouter();
  late bool _launching = widget.showSplash;
  late bool _bootstrapReady = !widget.showSplash && widget.bootstrap == null;
  late bool _splashDone = !widget.showSplash;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (widget.showSplash) {
      precacheImage(
        const AssetImage('assets/images/splash/rental_splash_background.png'),
        context,
      );
    }
  }

  @override
  void initState() {
    super.initState();
    if (widget.showSplash || widget.bootstrap != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _startBootstrap();
        }
      });
    }
  }

  Future<void> _startBootstrap() async {
    final bootstrap = widget.bootstrap ?? ref.read(appBootstrapProvider);
    try {
      final result = await ref
          .read(appBootstrapStateProvider.notifier)
          .initialize(bootstrap);
      _onBootstrapResult(result);
    } catch (error) {
      _onBootstrapResult(AppBootstrapState.error(error));
    }
  }

  Future<void> _retryBootstrap() async {
    final bootstrap = widget.bootstrap ?? ref.read(appBootstrapProvider);
    try {
      final result = await ref
          .read(appBootstrapStateProvider.notifier)
          .retry(bootstrap);
      _onBootstrapResult(result);
    } catch (error) {
      _onBootstrapResult(AppBootstrapState.error(error));
    }
  }

  void _onBootstrapResult(AppBootstrapState state) {
    if (!mounted) return;
    if (state.isReady) {
      setState(() {
        _bootstrapReady = true;
      });
      _checkDone();
    } else {
      setState(() {
        _bootstrapReady = false;
      });
      if (_splashDone && _launching) {
        setState(() => _launching = false);
      }
    }
  }

  void _onSplashDone() {
    _splashDone = true;
    final bootstrapState = ref.read(appBootstrapStateProvider);
    if (bootstrapState.hasError) {
      if (mounted && _launching) {
        setState(() => _launching = false);
      }
    } else {
      _checkDone();
    }
  }

  void _checkDone() {
    if (_splashDone && _bootstrapReady) {
      if (mounted && _launching) {
        setState(() => _launching = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bootstrapState = ref.watch(appBootstrapStateProvider);

    return MaterialApp.router(
      title: 'Westayplace',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      routerConfig: _router,

      builder: (context, child) => Stack(
        children: [
          if (_bootstrapReady)
            child ?? const SizedBox.shrink()
          else if (bootstrapState.hasError)
            AppBootstrapErrorView(
              error: bootstrapState.error,
              onRetry: _retryBootstrap,
            )
          else if (bootstrapState.isLoading && _splashDone)
            const Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            )
          else
            const SizedBox.shrink(),
          AnimatedSwitcher(
            duration: Tokens.slow,
            switchOutCurve: Tokens.ease,
            child: _launching
                ? SplashScreen(
                    key: const ValueKey('splash_screen'),
                    onDone: _onSplashDone,
                  )
                : const SizedBox.shrink(key: ValueKey('splash_done')),
          ),
        ],
      ),
    );
  }
}
