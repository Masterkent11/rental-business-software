import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/app.dart';

/// Supabase project settings.
///
/// The publishable key is safe in a shipped client — it grants nothing on its
/// own, because every table has RLS and the API never trusts it for authority.
/// The **secret** key must never appear here: it bypasses RLS entirely
/// (ADR-0006), and an app carrying it would hand every install a master key.
///
/// Both are compile-time values so a build can point at a different project:
///   flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_PUBLISHABLE_KEY=...
const _supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: 'https://yoscanunnqbzmlnwzift.supabase.co',
);
const _supabasePublishableKey = String.fromEnvironment(
  'SUPABASE_PUBLISHABLE_KEY',
  defaultValue: 'sb_publishable_kIi6Ltp2MkALYjGHCVeU3g_e5rAJp-q',
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // The SDK restores a session from the platform keychain here, so the app
  // knows whether anyone is signed in before the first frame — no flash of the
  // signed-out state for someone who never signed out.
  await Supabase.initialize(
    url: _supabaseUrl,
    publishableKey: _supabasePublishableKey,
  );

  runApp(const ProviderScope(child: CustomerApp()));
}
