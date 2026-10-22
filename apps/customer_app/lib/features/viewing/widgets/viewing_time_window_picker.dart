import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../data/viewing_repository.dart';
import '../../../design/motion.dart';
import '../../../design/tokens.dart';
import 'viewing_icon.dart';

class ViewingTimeWindowPicker extends StatelessWidget {
  const ViewingTimeWindowPicker({
    required this.day,
    required this.now,
    required this.selected,
    required this.onSelect,
    super.key,
  });

  final DateTime? day;
  final DateTime now;
  final ViewingTimeWindow? selected;
  final ValueChanged<ViewingTimeWindow> onSelect;

  static ViewingGlyph glyphFor(ViewingTimeWindow window) =>
      window == ViewingTimeWindow.evening ? ViewingGlyph.moon : ViewingGlyph.sun;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final window in ViewingTimeWindow.values) ...[
          if (window != ViewingTimeWindow.values.first) const SizedBox(width: Tokens.s8),
          Expanded(
            child: _WindowOption(
              window: window,
              selected: window == selected,
              enabled: day != null && window.isOpenOn(day!, now),
              onTap: () {
                HapticFeedback.selectionClick();
                onSelect(window);
              },
            ),
          ),
        ],
      ],
    );
  }
}

class _WindowOption extends StatelessWidget {
  const _WindowOption({required this.window, required this.selected, required this.enabled, required this.onTap});

  final ViewingTimeWindow window;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final duration = Motion.of(context, Motion.selection);
    final foreground = !enabled ? Tokens.muted.withValues(alpha: 0.45) : (selected ? Colors.white : Tokens.primaryNavy);
    final secondary = !enabled
        ? Tokens.muted.withValues(alpha: 0.45)
        : (selected ? Colors.white.withValues(alpha: 0.78) : Tokens.muted);
    return Semantics(
      button: true,
      enabled: enabled,
      selected: selected,
      label: '${window.label}, preferred ${window.spokenRange}${enabled ? '' : ', unavailable for this date'}',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: enabled ? onTap : null,
        child: AnimatedContainer(
          duration: duration,
          curve: Motion.enter,
          constraints: const BoxConstraints(minHeight: 82),
          padding: const EdgeInsets.symmetric(vertical: Tokens.s12, horizontal: Tokens.s4),
          decoration: BoxDecoration(
            color: selected ? Tokens.primaryNavy : Tokens.card,
            borderRadius: BorderRadius.circular(Tokens.rControl),
            border: Border.all(color: selected ? Tokens.primaryNavy : Tokens.hairline),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ViewingIcon(ViewingTimeWindowPicker.glyphFor(window), size: 20, color: foreground),
              const SizedBox(height: Tokens.s6),
              AnimatedDefaultTextStyle(
                duration: duration,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                  color: foreground,
                ),
                child: Text(window.label),
              ),
              const SizedBox(height: Tokens.s2),
              FittedBox(
                child: AnimatedDefaultTextStyle(
                  duration: duration,
                  style: TextStyle(fontSize: 11.5, color: secondary),
                  child: Text(window.compactRangeLabel),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
