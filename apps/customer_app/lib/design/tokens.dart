import 'package:flutter/widgets.dart';

abstract final class Tokens {
  static const double s2 = 2;
  static const double s4 = 4;
  static const double s6 = 6;
  static const double s8 = 8;
  static const double s12 = 12;
  static const double s16 = 16;
  static const double s20 = 20;
  static const double s24 = 24;
  static const double s32 = 32;
  static const double s40 = 40;
  static const double s48 = 48;
  static const double s56 = 56;
  static const double s64 = 64;

  static const double gutter = 20;

  static const double section = 44;

  static const double sectionTight = 28;

  static const double rSm = 12;
  static const double rMd = 18;
  static const double rLg = 24;
  static const double rXl = 32;
  static const Radius rPill = Radius.circular(999);

  static const double tap = 44;

  static const Color primaryNavy = Color(0xFF17243D);
  static const Color primaryBlue = Color(0xFF2563EB);
  static const Color softBlue = Color(0xFFEEF4FF);
  static const Color ink = Color(0xFF111318);
  static const Color inkSoft = Color(0xFF17243D);
  static const Color muted = Color(0xFF7B8190);
  static const Color hairline = Color(0xFFE7E8EC);
  static const Color canvas = Color(0xFFFAFAF8);
  static const Color card = Color(0xFFFFFFFF);

  static const Color inkDark = Color(0xFFF4F3F1);
  static const Color mutedDark = Color(0xFF9A9EA7);
  static const Color hairlineDark = Color(0xFF26282D);
  static const Color canvasDark = Color(0xFF0A0B0D);
  static const Color cardDark = Color(0xFF15171B);

  static const Color accent = Color(0xFF2563EB);
  static const Color verified = Color(0xFF388E3C);
  static const Color flame = Color(0xFFFA541C);

  static const Color available = Color(0xFF1B7A55);
  static const Color taken = Color(0xFFA33A2E);

  static const Color glass = Color(0x8C3A3A3A);
  static const Color glassStrong = Color(0xAD3A3A3A);
  static const double blurSigma = 14;

  static List<BoxShadow> lift = const [
    BoxShadow(color: Color(0x0D000000), blurRadius: 2, offset: Offset(0, 1)),
    BoxShadow(color: Color(0x14000000), blurRadius: 18, offset: Offset(0, 8)),
  ];

  static List<BoxShadow> liftHigh = const [
    BoxShadow(color: Color(0x1F000000), blurRadius: 30, offset: Offset(0, 14)),
  ];

  static const List<String> fontFallback = [
    'SF Pro Display',
    'SF Pro Text',
    '-apple-system',
    'BlinkMacSystemFont',
    'Helvetica Neue',
    'Inter',
    'Segoe UI',
  ];

  static const Duration quick = Duration(milliseconds: 140);

  static const Duration medium = Duration(milliseconds: 280);

  static const Duration slow = Duration(milliseconds: 440);

  static const Duration reveal = Duration(milliseconds: 520);

  static const Curve ease = Curves.easeOutCubic;

  static const Curve emphasised = Cubic(0.2, 0, 0, 1);

  static const ScrollPhysics scroll = BouncingScrollPhysics(
    parent: AlwaysScrollableScrollPhysics(),
  );
}
