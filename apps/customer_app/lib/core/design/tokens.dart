import 'package:flutter/material.dart';

/// Design tokens for the customer surface.
abstract final class Tokens {
  // Spacing (4pt grid)
  static const double s2 = 2;
  static const double s4 = 4;
  static const double s6 = 6;
  static const double s8 = 8;
  static const double s10 = 10;
  static const double s12 = 12;
  static const double s14 = 14;
  static const double s16 = 16;
  static const double s20 = 20;
  static const double s24 = 24;
  static const double s28 = 28;
  static const double s32 = 32;
  static const double s40 = 40;
  static const double s48 = 48;
  static const double s56 = 56;
  static const double s64 = 64;

  // Screen margins
  static const double gutter = 20;
  static const double maxContentWidth = 600;

  // Radii
  static const double rXs = 4;
  static const double rSm = 8;
  static const double rMd = 14;
  static const double rLg = 20;
  static const double rFull = 9999;

  static const Radius radXs = Radius.circular(rXs);
  static const Radius radSm = Radius.circular(rSm);
  static const Radius radMd = Radius.circular(rMd);
  static const Radius radLg = Radius.circular(rLg);
  static const Radius radFull = Radius.circular(rFull);

  static const BorderRadius borderXs = BorderRadius.all(radXs);
  static const BorderRadius borderSm = BorderRadius.all(radSm);
  static const BorderRadius borderMd = BorderRadius.all(radMd);
  static const BorderRadius borderLg = BorderRadius.all(radLg);
  static const BorderRadius borderFull = BorderRadius.all(radFull);

  // Elevation / Shadows
  static const List<BoxShadow> shadowSm = [
    BoxShadow(
      color: Color(0x0A000000),
      blurRadius: 6,
      offset: Offset(0, 2),
    ),
  ];

  static const List<BoxShadow> shadowMd = [
    BoxShadow(
      color: Color(0x0F000000),
      blurRadius: 16,
      offset: Offset(0, 4),
    ),
  ];

  static const List<BoxShadow> shadowLg = [
    BoxShadow(
      color: Color(0x1A000000),
      blurRadius: 32,
      offset: Offset(0, 8),
    ),
  ];

  // Colors
  static const Color ink = Color(0xFF0F172A);
  static const Color inkMuted = Color(0xFF64748B);
  static const Color inkSubtle = Color(0xFF94A3B8);

  static const Color canvas = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceMuted = Color(0xFFF8FAFC);
  static const Color surfaceSubtle = Color(0xFFF1F5F9);

  static const Color line = Color(0xFFE2E8F0);
  static const Color lineSubtle = Color(0xFFF1F5F9);

  static const Color accent = Color(0xFF0D9488);
  static const Color accentWarm = Color(0xFFF97316);
  static const Color accentSoft = Color(0xFFCCFBF1);

  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);

  static const Color overlayDim = Color(0x66000000);
}
