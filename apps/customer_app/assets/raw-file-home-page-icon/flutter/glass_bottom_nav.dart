import 'dart:ui';
import 'package:flutter/material.dart';

/// Controlled navigation: parent owns selectedIndex and actual destination pages.
/// Place in Scaffold.bottomNavigationBar with extendBody:true for visible glass.
class GlassBottomNav extends StatelessWidget {
  const GlassBottomNav({super.key, required this.selectedIndex,
    required this.onSelected});
  final int selectedIndex;
  final ValueChanged<int> onSelected;
  static const names = ['home', 'saved', 'bookings', 'messages', 'profile'];
  static const labels = ['Home', 'Saved', 'Bookings', 'Messages', 'Profile'];
  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.of(context).disableAnimations;
    return SafeArea(top: false, minimum: const EdgeInsets.fromLTRB(12, 6, 12, 8),
      child: ClipRRect(borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: DecoratedBox(decoration: BoxDecoration(
            color: Colors.white.withOpacity(.72),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white.withOpacity(.65))),
            child: SizedBox(height: 68, child: Row(children: [
              for (var i = 0; i < names.length; i++) Expanded(
                child: _NavItem(name: names[i], label: labels[i],
                  selected: selectedIndex == i, reduced: reduced,
                  onTap: () => onSelected(i))),
            ])),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatefulWidget {
  const _NavItem({required this.name, required this.label, required this.selected,
    required this.reduced, required this.onTap});
  final String name, label;
  final bool selected, reduced;
  final VoidCallback onTap;
  @override
  State<_NavItem> createState() => _NavItemState();
}
class _NavItemState extends State<_NavItem> {
  bool pressed = false;
  @override
  Widget build(BuildContext context) {
    final duration = Duration(milliseconds: widget.reduced ? 0 : 200);
    final state = widget.selected ? 'active' : 'inactive';
    return Semantics(button: true, selected: widget.selected, label: widget.label,
      child: GestureDetector(behavior: HitTestBehavior.opaque,
        onTapDown: (_) => setState(() => pressed = true),
        onTapUp: (_) => setState(() => pressed = false),
        onTapCancel: () => setState(() => pressed = false),
        onTap: widget.onTap,
        child: Padding(padding: const EdgeInsets.all(5),
          child: AnimatedScale(scale: pressed && !widget.reduced ? .94 : 1,
            duration: Duration(milliseconds: widget.reduced ? 0 : 100),
            child: AnimatedContainer(duration: duration, curve: Curves.easeOutCubic,
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(19),
                color: widget.selected ? const Color(0xFFDCE6F2).withOpacity(.82)
                  : Colors.transparent),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                AnimatedSlide(offset: widget.selected ? const Offset(0, -.06) : Offset.zero,
                  duration: duration, child: Image.asset(
                    'assets/westayplace/navigation/png/${widget.name}-$state.png',
                    width: 22, height: 22, excludeFromSemantics: true)),
                const SizedBox(height: 4),
                Text(widget.label, maxLines: 1, style: TextStyle(fontSize: 10,
                  fontWeight: widget.selected ? FontWeight.w600 : FontWeight.w400,
                  color: widget.selected ? const Color(0xFF142642) : const Color(0xFF7A8493))),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
