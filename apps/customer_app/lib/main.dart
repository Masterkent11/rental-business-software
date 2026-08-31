import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/app.dart';
import 'core/networking/api.config.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const config = ApiConfig.development;

  if (config.supabaseUrl.isNotEmpty && config.supabaseAnonKey.isNotEmpty) {
    try {
      await Supabase.initialize(
        url: config.supabaseUrl,
        // ignore: deprecated_member_use
        anonKey: config.supabaseAnonKey,
      );
    } catch (_) {}
  }

  runApp(const ProviderScope(child: CustomerApp()));
}
