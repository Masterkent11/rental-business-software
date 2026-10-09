import 'package:flutter/material.dart';

enum ShellDestination {
  home('Home', Icons.home_outlined, Icons.home_rounded),
  saved('Saved', Icons.favorite_border, Icons.favorite),
  bookings('Bookings', Icons.event_note_outlined, Icons.event_note),
  messages('Messages', Icons.chat_bubble_outline, Icons.chat_bubble),
  profile('Profile', Icons.person_outline, Icons.person);

  const ShellDestination(this.label, this.icon, this.activeIcon);

  final String label;
  final IconData icon;
  final IconData activeIcon;

  static ShellDestination ofIndex(int index) => values[index.clamp(0, values.length - 1)];
}
