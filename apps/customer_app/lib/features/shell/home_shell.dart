import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';


/// The three-tab frame.
///
/// A translucent bar with a real blur behind it, so content scrolls *under* the
/// tabs instead of stopping at an opaque strip — the single detail that most
/// separates an iOS-feeling app from a boxy one.
class HomeShell extends StatelessWidget {
  const HomeShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  static const _tabs = [
    (Icons.search, Icons.search, 'Discover'),
    (Icons.favorite_border, Icons.favorite, 'Saved'),
    (Icons.confirmation_number_outlined, Icons.confirmation_number, 'Bookings'),
    (Icons.person_outline, Icons.person, 'Account'),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      extendBody: true,
      body: navigationShell,
      bottomNavigationBar: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
          child: Container(
            decoration: BoxDecoration(
              color: theme.colorScheme.surface.withOpacity(0.82),
              border: Border(
                top: BorderSide(color: theme.colorScheme.outlineVariant),
              ),
            ),
            child: SafeArea(
              top: false,
              child: SizedBox(
                height: 56,
                child: Row(
                  children: [
                    for (var i = 0; i < _tabs.length; i++)
                      Expanded(
                        child: _Tab(
                          icon: _tabs[i].$1,
                          activeIcon: _tabs[i].$2,
                          label: _tabs[i].$3,
                          selected: navigationShell.currentIndex == i,
                          onTap: () {
                            HapticFeedback.selectionClick();
                            navigationShell.goBranch(
                              i,
                              // Tapping the active tab returns to its root,
                              // which is what every other app on the phone
                              // does.
                              initialLocation:
                                  i == navigationShell.currentIndex,
                            );
                          },
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = selected
        ? theme.colorScheme.onSurface
        : theme.colorScheme.onSurfaceVariant;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(selected ? activeIcon : icon, size: 23, color: color),
          const SizedBox(height: 3),
          Text(
            label,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
              color: color,
              letterSpacing: 0.05,
            ),
          ),
        ],
      ),
    );
  }
}
