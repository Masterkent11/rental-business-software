import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'tokens.dart';

abstract final class AppTheme {
  static ThemeData get light {
    final base = ThemeData.light(useMaterial3: true);

    return base.copyWith(
      scaffoldBackgroundColor: Tokens.canvas,
      colorScheme: const ColorScheme.light(
        primary: Tokens.ink,
        onPrimary: Tokens.surface,
        secondary: Tokens.accent,
        onSecondary: Tokens.surface,
        surface: Tokens.surface,
        onSurface: Tokens.ink,
        error: Tokens.danger,
        onError: Tokens.surface,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Tokens.canvas,
        foregroundColor: Tokens.ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        titleTextStyle: TextStyle(
          color: Tokens.ink,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: const CardTheme(
        color: Tokens.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: Tokens.borderLg,
          side: BorderSide(color: Tokens.line),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: Tokens.line,
        thickness: 1,
        space: 1,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: Tokens.ink,
          foregroundColor: Tokens.surface,
          minimumSize: const Size.fromHeight(48),
          shape: const RoundedRectangleBorder(
            borderRadius: Tokens.borderMd,
          ),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.2,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: Tokens.ink,
          minimumSize: const Size.fromHeight(48),
          side: const BorderSide(color: Tokens.line),
          shape: const RoundedRectangleBorder(
            borderRadius: Tokens.borderMd,
          ),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.2,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: Tokens.ink,
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: Tokens.surfaceMuted,
        contentPadding: EdgeInsets.symmetric(
          horizontal: Tokens.s16,
          vertical: Tokens.s12,
        ),
        border: OutlineInputBorder(
          borderRadius: Tokens.borderMd,
          borderSide: BorderSide(color: Tokens.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: Tokens.borderMd,
          borderSide: BorderSide(color: Tokens.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: Tokens.borderMd,
          borderSide: BorderSide(color: Tokens.ink, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: Tokens.borderMd,
          borderSide: BorderSide(color: Tokens.danger),
        ),
        hintStyle: TextStyle(
          color: Tokens.inkMuted,
          fontSize: 14,
        ),
      ),
    );
  }
}
