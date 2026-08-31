import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/design/tokens.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (mounted) context.go('/');
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Tokens.ink,
      body: Center(
        child: CircularProgressIndicator(color: Tokens.surface),
      ),
    );
  }
}
