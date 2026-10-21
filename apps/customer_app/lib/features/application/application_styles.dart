import 'package:flutter/material.dart';

abstract final class ApplicationStyles {
  static const navy = Color(0xFF061A50);
  static const blue = Color(0xFF0766FF);
  static const border = Color(0xFFE1E7F1);
  static const muted = Color(0xFF74829E);
  static const pale = Color(0xFFEDF2FA);
  static const heading = TextStyle(fontSize: 20, height: 1.25, fontWeight: FontWeight.w600, color: navy);
  static const label = TextStyle(fontSize: 15, height: 1.3, fontWeight: FontWeight.w600, color: navy);
  static const value = TextStyle(fontSize: 16, height: 1.3, color: navy);
  static const helper = TextStyle(fontSize: 14, height: 1.4, color: muted);
  static ButtonStyle get button => FilledButton.styleFrom(
      backgroundColor: navy,
      foregroundColor: Colors.white,
      textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
      minimumSize: const Size.fromHeight(56),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)));
}
