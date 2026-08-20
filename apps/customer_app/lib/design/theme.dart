import 'package:flutter/material.dart';

import 'tokens.dart';

/// Light and dark themes.
///
/// Material is used as plumbing, not as a look: the ripples, tints, and
/// elevation overlays that mark an app as "Flutter with default Material" are
/// switched off deliberately.
abstract final class AppTheme {
  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;

    final ink = isDark ? Tokens.inkDark : Tokens.ink;
    final muted = isDark ? Tokens.mutedDark : Tokens.muted;
    final canvas = isDark ? Tokens.canvasDark : Tokens.canvas;
    final card = isDark ? Tokens.cardDark : Tokens.card;
    final hairline = isDark ? Tokens.hairlineDark : Tokens.hairline;

    final scheme = ColorScheme(
      brightness: brightness,
      primary: ink,
      onPrimary: canvas,
      secondary: Tokens.accent,
      onSecondary: Colors.white,
      error: Tokens.taken,
      onError: Colors.white,
      surface: canvas,
      onSurface: ink,
      surfaceContainerHighest: card,
      onSurfaceVariant: muted,
      outlineVariant: hairline,
      outline: hairline,
    );

    final text = _textTheme(ink, muted);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: canvas,
      canvasColor: canvas,
      textTheme: text,
      fontFamilyFallback: Tokens.fontFallback,

      // Kill the Android tells.
      splashFactory: NoSplash.splashFactory,
      highlightColor: Colors.transparent,
      splashColor: Colors.transparent,

      // iOS-style push/pop on every platform, so the app feels the same in the
      // simulator and in Chrome while it is being reviewed.
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.android: CupertinoPageTransitionsBuilder(),
        },
      ),

      appBarTheme: AppBarTheme(
        backgroundColor: canvas,
        surfaceTintColor: Colors.transparent,
        foregroundColor: ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        titleTextStyle: text.titleLarge,
      ),

      dividerTheme: DividerThemeData(color: hairline, thickness: 1, space: 1),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: ink,
          foregroundColor: canvas,
          minimumSize: const Size.fromHeight(54),
          textStyle: text.labelLarge,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Tokens.rMd),
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: ink,
          textStyle: text.labelLarge,
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: card,
        hintStyle: text.bodyMedium?.copyWith(color: muted),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Tokens.rMd),
          borderSide: BorderSide(color: hairline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Tokens.rMd),
          borderSide: BorderSide(color: hairline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Tokens.rMd),
          borderSide: BorderSide(color: ink.withOpacity(0.45)),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: Tokens.s16,
          vertical: Tokens.s16,
        ),
      ),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: canvas,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(Tokens.rXl)),
        ),
        showDragHandle: true,
        dragHandleColor: hairline,
      ),

      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: ink,
        contentTextStyle: text.bodyMedium?.copyWith(color: canvas),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Tokens.rSm),
        ),
        insetPadding: const EdgeInsets.all(Tokens.s16),
      ),
    );
  }

  /// Tight, iOS-ish type. Negative tracking on the big sizes is most of what
  /// separates a considered screen from a default one.
  static TextTheme _textTheme(Color ink, Color muted) {
    return TextTheme(
      displaySmall: TextStyle(
        fontSize: 34,
        height: 1.08,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.9,
        color: ink,
      ),
      headlineMedium: TextStyle(
        fontSize: 27,
        height: 1.15,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.6,
        color: ink,
      ),
      headlineSmall: TextStyle(
        fontSize: 22,
        height: 1.2,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.4,
        color: ink,
      ),
      titleLarge: TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
        color: ink,
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        height: 1.3,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
        color: ink,
      ),
      bodyLarge: TextStyle(
        fontSize: 15.5,
        height: 1.45,
        fontWeight: FontWeight.w400,
        color: ink,
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        height: 1.4,
        fontWeight: FontWeight.w400,
        color: ink,
      ),
      bodySmall: TextStyle(fontSize: 13, height: 1.35, color: muted),
      labelLarge: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.1,
      ),
      labelMedium: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.1,
        color: ink,
      ),
      labelSmall: TextStyle(
        fontSize: 11.5,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.1,
        color: muted,
      ),
    );
  }
}
