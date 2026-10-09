import 'package:flutter/material.dart';

import 'tokens.dart';

abstract final class AppText {
  static const TextStyle hero = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.6,
    height: 1.15,
    color: Tokens.primaryNavy,
  );

  static const TextStyle pageTitle = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.4,
    height: 1.2,
    color: Tokens.primaryNavy,
  );

  static const TextStyle sectionTitle = TextStyle(
    fontSize: 19,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.3,
    height: 1.25,
    color: Tokens.primaryNavy,
  );

  static const TextStyle cardTitle = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.2,
    height: 1.3,
    color: Tokens.primaryNavy,
  );

  static const TextStyle body = TextStyle(fontSize: 15, height: 1.45, color: Tokens.ink);

  static const TextStyle supporting = TextStyle(fontSize: 14, height: 1.4, color: Tokens.muted);

  static const TextStyle caption = TextStyle(fontSize: 12, height: 1.3, color: Tokens.muted);

  static const TextStyle captionStrong = TextStyle(
    fontSize: 12,
    height: 1.3,
    fontWeight: FontWeight.w600,
    color: Tokens.primaryNavy,
  );

  static const TextStyle button = TextStyle(fontSize: 15, fontWeight: FontWeight.w600, letterSpacing: -0.1);

  static const TextStyle control = TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Tokens.ink);

  static const TextStyle chip = TextStyle(fontSize: 13, fontWeight: FontWeight.w600, letterSpacing: -0.1);

  static const TextStyle navLabel = TextStyle(fontSize: 11, letterSpacing: -0.1);

  static const TextStyle onPhotoTitle = TextStyle(
    fontSize: 26,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.5,
    height: 1.15,
    color: Colors.white,
  );

  static const TextStyle onPhotoSupporting = TextStyle(fontSize: 14, height: 1.35, color: Color(0xE6FFFFFF));

  static const TextStyle heroCardTitle = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.5,
    height: 1.15,
    color: Colors.white,
  );

  static const TextStyle editorialTitle = TextStyle(
    fontSize: 19,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.3,
    height: 1.2,
    color: Colors.white,
  );

  static const TextStyle eyebrow = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.4,
    color: Colors.white,
  );

  static const TextStyle fieldLabel = TextStyle(fontSize: 12, height: 1.2, color: Tokens.muted);

  static const TextStyle fieldValue = TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Tokens.ink);
}
