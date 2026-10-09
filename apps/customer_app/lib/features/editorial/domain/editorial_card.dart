import 'package:flutter/foundation.dart';

enum EditorialAction { exploreHomes, homesForSale, virtualTours, contactSupport, shortStays, monthlyStays }

enum EditorialPlacement { home, staySearch }

@immutable
class EditorialCard {
  const EditorialCard({
    required this.id,
    required this.title,
    required this.body,
    required this.actionLabel,
    required this.image,
    required this.action,
    this.eyebrow,
  });

  final String id;
  final String? eyebrow;
  final String title;
  final String body;
  final String actionLabel;
  final String image;
  final EditorialAction action;
}
