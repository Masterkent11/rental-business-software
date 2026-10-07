import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../design/tokens.dart';

class HomeShell extends StatelessWidget {
  const HomeShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    final activeIndex = switch (navigationShell.currentIndex) {
      0 => 0,
      1 => 2,
      2 => 3,
      3 => 4,
      _ => 0,
    };

    return Scaffold(
      extendBody: true,
      body: navigationShell,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(color: Color(0xFFE7E8EC), width: 0.8),
          ),
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 56,
            child: Row(
              children: [
                Expanded(
                  child: _NavItem(
                    icon: Icons.home,
                    label: 'Home',
                    selected: activeIndex == 0,
                    onTap: () {
                      HapticFeedback.selectionClick();
                      navigationShell.goBranch(
                        0,
                        initialLocation: navigationShell.currentIndex == 0,
                      );
                    },
                  ),
                ),
                Expanded(
                  child: _NavItem(
                    icon: Icons.explore_outlined,
                    label: 'Explore',
                    selected: false,
                    onTap: () {
                      HapticFeedback.selectionClick();
                      navigationShell.goBranch(0);
                    },
                  ),
                ),
                Expanded(
                  child: _NavItem(
                    icon: Icons.favorite_border,
                    label: 'Saved',
                    selected: activeIndex == 2,
                    onTap: () {
                      HapticFeedback.selectionClick();
                      navigationShell.goBranch(
                        1,
                        initialLocation: navigationShell.currentIndex == 1,
                      );
                    },
                  ),
                ),
                Expanded(
                  child: _NavItem(
                    icon: Icons.calendar_month_outlined,
                    label: 'Bookings',
                    selected: activeIndex == 3,
                    onTap: () {
                      HapticFeedback.selectionClick();
                      navigationShell.goBranch(
                        2,
                        initialLocation: navigationShell.currentIndex == 2,
                      );
                    },
                  ),
                ),
                Expanded(
                  child: _NavItem(
                    icon: Icons.person_outline,
                    label: 'Profile',
                    selected: activeIndex == 4,
                    onTap: () {
                      HapticFeedback.selectionClick();
                      navigationShell.goBranch(
                        3,
                        initialLocation: navigationShell.currentIndex == 3,
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? Tokens.primaryBlue : Tokens.muted;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 21, color: color),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: color,
              letterSpacing: -0.1,
            ),
          ),
        ],
      ),
    );
  }
}
