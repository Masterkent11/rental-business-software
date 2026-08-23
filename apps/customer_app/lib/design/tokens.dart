import 'package:flutter/widgets.dart';

/// Design tokens.
///
/// The target is a premium iOS app: near-black ink, warm neutrals, one accent
/// used sparingly, and photography carrying the colour. Nothing here is a
/// brand-coloured surface — a marketplace list is already busy, and tinting the
/// chrome is what makes an app look like a template.
abstract final class Tokens {
  // ---------------------------------------------------------------- spacing
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

  /// Horizontal page inset. 20 reads better than 16 on a 390pt iPhone.
  static const double gutter = 20;

  /// Air between major sections of a screen.
  ///
  /// Deliberately large. A rental listing is a considered purchase, not a feed:
  /// crowding the price against the photographs against the house rules makes
  /// every one of them feel like a detail, and the customer skims instead of
  /// reading. Space is what tells them this is worth their attention.
  static const double section = 44;

  /// Air above a heading that opens a new idea.
  static const double sectionTight = 28;

  // ----------------------------------------------------------------- radius
  static const double rSm = 12;
  static const double rMd = 18;
  static const double rLg = 24;
  static const double rXl = 32;
  static const Radius rPill = Radius.circular(999);

  /// iOS minimum tap target.
  static const double tap = 44;

  // ---------------------------------------------------------------- palette
  static const Color ink = Color(0xFF0E0F12);
  static const Color inkSoft = Color(0xFF3A3D44);
  static const Color muted = Color(0xFF787C85);
  static const Color hairline = Color(0xFFE6E4E0);
  static const Color canvas = Color(0xFFFBFAF8);
  static const Color card = Color(0xFFFFFFFF);

  static const Color inkDark = Color(0xFFF4F3F1);
  static const Color mutedDark = Color(0xFF9A9EA7);
  static const Color hairlineDark = Color(0xFF26282D);
  static const Color canvasDark = Color(0xFF0A0B0D);
  static const Color cardDark = Color(0xFF15171B);

  /// Warm accent. Used for the move-in cost figure and little else — scarcity
  /// is what makes it read as considered rather than decorative.
  static const Color accent = Color(0xFFB4622A);

  static const Color available = Color(0xFF1B7A55);
  static const Color taken = Color(0xFFA33A2E);

  /// Glass chrome over photography, lifted straight from the reference: a
  /// neutral dark scrim, never a tinted one.
  static const Color glass = Color(0x8C3A3A3A);
  static const Color glassStrong = Color(0xAD3A3A3A);
  static const double blurSigma = 14;

  // --------------------------------------------------------------- elevation
  static List<BoxShadow> lift = const [
    BoxShadow(color: Color(0x0D000000), blurRadius: 2, offset: Offset(0, 1)),
    BoxShadow(color: Color(0x14000000), blurRadius: 18, offset: Offset(0, 8)),
  ];

  static List<BoxShadow> liftHigh = const [
    BoxShadow(color: Color(0x1F000000), blurRadius: 30, offset: Offset(0, 14)),
  ];

  /// Font stack. On iOS and macOS this resolves to SF Pro, which is the single
  /// biggest thing that makes a Flutter app stop looking like a Flutter app.
  static const List<String> fontFallback = [
    'SF Pro Display',
    'SF Pro Text',
    '-apple-system',
    'BlinkMacSystemFont',
    'Helvetica Neue',
    'Inter',
    'Segoe UI',
  ];

  // ----------------------------------------------------------------- motion
  //
  // One vocabulary, four durations. Scattered ad-hoc timings are what make an
  // app feel assembled rather than designed — the eye notices inconsistent
  // motion long before it can name it.

  /// A control acknowledging a touch.
  static const Duration quick = Duration(milliseconds: 140);

  /// Something appearing or changing in place.
  static const Duration medium = Duration(milliseconds: 280);

  /// A screen or a scene arriving.
  static const Duration slow = Duration(milliseconds: 440);

  /// Content settling in after a screen has already appeared.
  static const Duration reveal = Duration(milliseconds: 520);

  /// Decelerating, never bouncy. iOS motion is confident, not playful.
  static const Curve ease = Curves.easeOutCubic;

  /// For things that grow into place — a sheet, a hero, a card.
  static const Curve emphasised = Cubic(0.2, 0, 0, 1);

  /// iOS-feeling scroll behaviour, everywhere. Android gets it too, on purpose:
  /// a consistent overscroll beats a per-platform one in a product this visual.
  static const ScrollPhysics scroll = BouncingScrollPhysics(
    parent: AlwaysScrollableScrollPhysics(),
  );
}
