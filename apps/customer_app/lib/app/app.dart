import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../design/theme.dart';
import '../design/tokens.dart';
import '../features/launch/splash_screen.dart';
import 'router.dart';

class CustomerApp extends StatefulWidget {
  const CustomerApp({this.showSplash = true, super.key});

  final bool showSplash;

  @override
  State<CustomerApp> createState() => _CustomerAppState();
}

class _CustomerAppState extends State<CustomerApp> {
  late final GoRouter _router = buildRouter();
  late bool _launching = widget.showSplash;

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Rental Platform',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      routerConfig: _router,

      builder: (context, child) => Stack(
        children: [
          child ?? const SizedBox.shrink(),
          if (_launching)
            AnimatedSwitcher(
              duration: Tokens.slow,
              switchOutCurve: Tokens.ease,
              child: SplashScreen(
                onDone: () {
                  if (mounted) setState(() => _launching = false);
                },
              ),
            ),
        ],
      ),
    );
  }
}
