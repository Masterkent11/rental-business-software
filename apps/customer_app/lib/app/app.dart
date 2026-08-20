import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../design/theme.dart';
import 'router.dart';

class CustomerApp extends StatefulWidget {
  const CustomerApp({super.key});

  @override
  State<CustomerApp> createState() => _CustomerAppState();
}

class _CustomerAppState extends State<CustomerApp> {
  late final GoRouter _router = buildRouter();

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Rental Platform',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      routerConfig: _router,
    );
  }
}
