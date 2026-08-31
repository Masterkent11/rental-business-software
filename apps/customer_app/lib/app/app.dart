import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/design/theme.dart';
import 'router.dart';

class CustomerApp extends StatefulWidget {
  const CustomerApp({
    this.initialLocation = '/',
    super.key,
  });

  final String initialLocation;

  @override
  State<CustomerApp> createState() => _CustomerAppState();
}

class _CustomerAppState extends State<CustomerApp> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _router = createRouter(initialLocation: widget.initialLocation);
  }

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Rentals',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: _router,
    );
  }
}
