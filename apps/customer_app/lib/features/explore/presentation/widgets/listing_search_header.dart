import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../design/controls.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';

class ListingPageTitle extends StatelessWidget {
  const ListingPageTitle({required this.title, super.key});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s12, Tokens.gutter, Tokens.s4),
      child: Text(
        title,
        key: const Key('listing-results-title'),
        textAlign: TextAlign.center,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: AppText.sectionTitle.copyWith(fontSize: 18),
      ),
    );
  }
}

class ListingSearchHeaderDelegate extends SliverPersistentHeaderDelegate {
  const ListingSearchHeaderDelegate({required this.search, required this.controls, this.onBack});

  static const double extent = Tokens.s4 + Tokens.searchFieldHeight + Tokens.s2 + Tokens.tap + Tokens.s2;

  final Widget search;
  final Widget controls;
  final VoidCallback? onBack;

  @override
  double get minExtent => extent;

  @override
  double get maxExtent => extent;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return ListingSearchHeader(
      search: search,
      controls: controls,
      onBack: onBack,
      elevated: shrinkOffset > 0 || overlapsContent,
    );
  }

  @override
  bool shouldRebuild(ListingSearchHeaderDelegate oldDelegate) =>
      oldDelegate.search != search || oldDelegate.controls != controls || oldDelegate.onBack != onBack;
}

class ListingSearchHeader extends StatelessWidget {
  const ListingSearchHeader({
    required this.search,
    required this.controls,
    this.onBack,
    this.elevated = false,
    super.key,
  });

  final Widget search;
  final Widget controls;
  final VoidCallback? onBack;
  final bool elevated;

  @override
  Widget build(BuildContext context) {
    final leading = onBack == null ? Tokens.gutter : Tokens.s4;
    return AnimatedContainer(
      key: const Key('listing-search-header'),
      duration: Tokens.quick,
      height: ListingSearchHeaderDelegate.extent,
      decoration: BoxDecoration(
        color: Tokens.canvas,
        border: Border(bottom: BorderSide(color: elevated ? Tokens.hairline : Tokens.canvas)),
        boxShadow: elevated
            ? const [BoxShadow(color: Color(0x0A17243D), blurRadius: 10, offset: Offset(0, 4))]
            : const [],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(leading, Tokens.s4, Tokens.gutter, Tokens.s2),
            child: Row(
              children: [
                if (onBack != null)
                  AppIconButton(
                    key: const Key('listing-search-back'),
                    icon: Icons.arrow_back_ios_new_rounded,
                    semanticLabel: 'Back',
                    size: 20,
                    onPressed: onBack!,
                  ),
                Expanded(child: search),
              ],
            ),
          ),
          SizedBox(
            height: Tokens.tap,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
              child: controls,
            ),
          ),
        ],
      ),
    );
  }
}

class ListingQuickControl {
  const ListingQuickControl({
    required this.id,
    required this.label,
    required this.leading,
    required this.onTap,
    this.active = false,
  });

  final String id;
  final String label;
  final Widget leading;
  final VoidCallback onTap;
  final bool active;
}

class ListingQuickControls extends StatelessWidget {
  const ListingQuickControls({required this.controls, super.key});

  final List<ListingQuickControl> controls;

  @override
  Widget build(BuildContext context) {
    return Row(
      key: const Key('listing-quick-controls'),
      children: [
        for (final (index, control) in controls.indexed)
          Expanded(
            child: Align(
              alignment: switch (index) {
                0 => Alignment.centerLeft,
                _ when index == controls.length - 1 => Alignment.centerRight,
                _ => Alignment.center,
              },
              child: _QuickControlButton(control: control),
            ),
          ),
      ],
    );
  }
}

class _QuickControlButton extends StatelessWidget {
  const _QuickControlButton({required this.control});

  final ListingQuickControl control;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: control.active ? '${control.label}, active' : control.label,
      excludeSemantics: true,
      child: GestureDetector(
        key: Key('listing-control-${control.id}'),
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.selectionClick();
          control.onTap();
        },
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: Tokens.tap, minWidth: Tokens.tap),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: Tokens.s2),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconTheme(
                  data: const IconThemeData(size: Tokens.iconSm, color: Tokens.primaryNavy),
                  child: control.leading,
                ),
                const SizedBox(width: Tokens.s4),
                Flexible(
                  child: Text(
                    control.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppText.chip.copyWith(
                      color: Tokens.primaryNavy,
                      fontWeight: control.active ? FontWeight.w700 : FontWeight.w600,
                    ),
                  ),
                ),
                if (control.active) ...[
                  const SizedBox(width: Tokens.s4),
                  Container(
                    key: Key('listing-control-${control.id}-active'),
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(color: Tokens.primaryNavy, shape: BoxShape.circle),
                  ),
                ],
                const SizedBox(width: Tokens.s2),
                const Icon(Icons.keyboard_arrow_down_rounded, size: Tokens.iconSm, color: Tokens.primaryNavy),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class PesoGlyph extends StatelessWidget {
  const PesoGlyph({super.key});

  @override
  Widget build(BuildContext context) {
    final icon = IconTheme.of(context);
    return SizedBox(
      width: icon.size,
      child: Text(
        '₱',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: (icon.size ?? Tokens.iconSm) - 1, fontWeight: FontWeight.w700, color: icon.color, height: 1),
      ),
    );
  }
}
