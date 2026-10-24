import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'home_assets.dart';
import 'tokens.dart';

class GlassBottomNav extends StatelessWidget {
  const GlassBottomNav({
    super.key,
    required this.selectedIndex,
    required this.onSelected,
    this.unreadMessages = 0,
    this.tenantMode = false,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelected;
  final int unreadMessages;
  final bool tenantMode;

  static const _items = [
    (
      label: 'Explore',
      icon: Icons.search,
      activeAsset: HomeAssets.navHomeActivePng,
      inactiveAsset: HomeAssets.navHomeInactivePng,
    ),
    (
      label: 'Saved',
      icon: Icons.favorite_border,
      activeAsset: HomeAssets.navSavedActivePng,
      inactiveAsset: HomeAssets.navSavedInactivePng,
    ),
    (
      label: 'Bookings',
      icon: Icons.event_note_outlined,
      activeAsset: HomeAssets.navBookingsActivePng,
      inactiveAsset: HomeAssets.navBookingsInactivePng,
    ),
    (
      label: 'Messages',
      icon: Icons.chat_bubble_outline,
      activeAsset: HomeAssets.navMessagesActivePng,
      inactiveAsset: HomeAssets.navMessagesInactivePng,
    ),
    (
      label: 'Profile',
      icon: Icons.person_outline,
      activeAsset: HomeAssets.navProfileActivePng,
      inactiveAsset: HomeAssets.navProfileInactivePng,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.of(context).disableAnimations;

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.85),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(
              top: BorderSide(
                color: const Color(0xFFE5E7EB).withValues(alpha: 0.85),
                width: 0.8,
              ),
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x10142642),
                blurRadius: 16,
                offset: Offset(0, -4),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: SizedBox(
              height: 60,
              child: Row(
                children: [
                  for (var i = 0; i < _items.length; i++)
                    Expanded(
                      child: _GlassNavItem(
                        label: tenantMode && i == 2 ? 'My Home' : _items[i].label,
                        icon: tenantMode && i == 2
                            ? (selectedIndex == i ? Icons.home_rounded : Icons.home_outlined)
                            : _items[i].icon,
                        useIcon: tenantMode || i == 0,
                        activeAsset: _items[i].activeAsset,
                        inactiveAsset: _items[i].inactiveAsset,
                        selected: selectedIndex == i,
                        reduced: reduced,
                        badge: i == 3 ? unreadMessages : 0,
                        onTap: () {
                          HapticFeedback.selectionClick();
                          onSelected(i);
                        },
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _GlassNavItem extends StatefulWidget {
  const _GlassNavItem({
    required this.label,
    required this.icon,
    required this.activeAsset,
    required this.inactiveAsset,
    required this.selected,
    required this.reduced,
    required this.onTap,
    this.badge = 0,
    this.useIcon = false,
  });

  final String label;
  final IconData icon;
  final String activeAsset;
  final String inactiveAsset;
  final bool selected;
  final bool reduced;
  final VoidCallback onTap;
  final int badge;
  final bool useIcon;

  @override
  State<_GlassNavItem> createState() => _GlassNavItemState();
}

class _GlassNavItemState extends State<_GlassNavItem> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final duration = Duration(milliseconds: widget.reduced ? 0 : 180);
    final asset = widget.selected ? widget.activeAsset : widget.inactiveAsset;

    return Semantics(
      button: true,
      selected: widget.selected,
      label: widget.badge > 0 ? '${widget.label}, ${widget.badge} unread' : widget.label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) => setState(() => _pressed = true),
        onTapUp: (_) => setState(() => _pressed = false),
        onTapCancel: () => setState(() => _pressed = false),
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: _pressed && !widget.reduced ? 0.94 : 1,
          duration: Duration(milliseconds: widget.reduced ? 0 : 100),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedContainer(
                duration: duration,
                curve: Curves.easeOutCubic,
                width: 54,
                height: 32,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: widget.selected && !widget.useIcon
                      ? const Color(0xFFDCE6F2).withValues(alpha: 0.88)
                      : Colors.transparent,
                ),
                child: Center(
                  child: Stack(
                    alignment: Alignment.center,
                    clipBehavior: Clip.none,
                    children: [
                      Icon(
                        widget.icon,
                        size: 22,
                        color: widget.useIcon
                            ? (widget.selected ? const Color(0xFF0C2348) : const Color(0xFF8D9DB8))
                            : Colors.transparent,
                      ),
                      if (!widget.useIcon)
                        Image.asset(
                          asset,
                          width: 22,
                          height: 22,
                          excludeFromSemantics: true,
                        ),
                      if (widget.badge > 0)
                        Positioned(
                          right: -8,
                          top: -4,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: Tokens.taken,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              widget.badge > 9 ? '9+' : '${widget.badge}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                widget.label,
                maxLines: 1,
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: widget.selected ? FontWeight.w700 : FontWeight.w500,
                  color: widget.selected ? const Color(0xFF142642) : const Color(0xFF7A8493),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
