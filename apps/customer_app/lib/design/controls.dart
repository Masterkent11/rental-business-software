import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'glass.dart';
import 'tokens.dart';
import 'typography.dart';

BoxDecoration _controlSurface({bool focused = false}) => BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(Tokens.rControl),
      border: Border.all(color: focused ? Tokens.primaryNavy.withValues(alpha: 0.5) : Tokens.hairline),
      boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 6, offset: Offset(0, 2))],
    );

class AppSearchField extends StatelessWidget {
  const AppSearchField({
    required this.hint,
    this.controller,
    this.focusNode,
    this.onChanged,
    this.onSubmitted,
    this.onTap,
    this.onClear,
    this.readOnly = false,
    this.autofocus = false,
    super.key,
  });

  final String hint;
  final TextEditingController? controller;
  final FocusNode? focusNode;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onTap;
  final VoidCallback? onClear;
  final bool readOnly;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    final field = Container(
      height: Tokens.searchFieldHeight,
      padding: const EdgeInsets.symmetric(horizontal: Tokens.s12),
      decoration: _controlSurface(),
      child: Row(
        children: [
          const Icon(Icons.search_rounded, size: Tokens.controlIcon, color: Tokens.muted),
          const SizedBox(width: Tokens.s8),
          Expanded(
            child: readOnly
                ? Text(
                    controller?.text.isNotEmpty == true ? controller!.text : hint,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: controller?.text.isNotEmpty == true
                        ? AppText.control
                        : AppText.control.copyWith(color: Tokens.muted),
                  )
                : TextField(
                    controller: controller,
                    focusNode: focusNode,
                    autofocus: autofocus,
                    onChanged: onChanged,
                    onSubmitted: onSubmitted,
                    textInputAction: TextInputAction.search,
                    style: AppText.control,
                    decoration: InputDecoration(
                      isDense: true,
                      filled: false,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                      hintText: hint,
                      hintStyle: AppText.control.copyWith(color: Tokens.muted, fontWeight: FontWeight.w400),
                    ),
                  ),
          ),
          if (onClear != null && (controller?.text.isNotEmpty ?? false))
            AppIconButton(icon: Icons.close_rounded, semanticLabel: 'Clear search', onPressed: onClear!, size: 18),
        ],
      ),
    );
    if (!readOnly) return field;
    return Semantics(
      button: true,
      label: hint,
      child: GestureDetector(behavior: HitTestBehavior.opaque, onTap: onTap, child: field),
    );
  }
}

class AppFilterButton extends StatelessWidget {
  const AppFilterButton({required this.onPressed, this.activeCount = 0, super.key});

  final VoidCallback onPressed;
  final int activeCount;

  @override
  Widget build(BuildContext context) => AppSquareIconButton(
        icon: Icons.tune_rounded,
        semanticLabel: activeCount > 0 ? 'Filters, $activeCount active' : 'Filters',
        active: activeCount > 0,
        onPressed: onPressed,
      );
}

class AppSquareIconButton extends StatelessWidget {
  const AppSquareIconButton({
    required this.icon,
    required this.semanticLabel,
    required this.onPressed,
    this.size = Tokens.filterButtonSize,
    this.active = false,
    super.key,
  });

  final IconData icon;
  final String semanticLabel;
  final VoidCallback onPressed;
  final double size;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.selectionClick();
          onPressed();
        },
        child: Container(
          width: size,
          height: size,
          decoration: _controlSurface(),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Icon(icon, size: Tokens.controlIcon, color: Tokens.primaryNavy),
              if (active)
                const Positioned(
                  top: Tokens.s8,
                  right: Tokens.s8,
                  child: SizedBox.square(
                    dimension: Tokens.s8,
                    child: DecoratedBox(
                      decoration: BoxDecoration(color: Tokens.primaryBlue, shape: BoxShape.circle),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class AppSegment<T> {
  const AppSegment({required this.value, required this.label});

  final T value;
  final String label;
}

class AppSegmentedControl<T> extends StatelessWidget {
  const AppSegmentedControl({
    required this.segments,
    required this.selected,
    required this.onChanged,
    this.onPhoto = false,
    super.key,
  });

  final List<AppSegment<T>> segments;
  final T selected;
  final ValueChanged<T> onChanged;
  final bool onPhoto;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: Tokens.segmentedHeight,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: onPhoto ? Colors.white.withValues(alpha: 0.92) : const Color(0xFFF0F1F4),
        borderRadius: BorderRadius.circular(Tokens.rControl),
      ),
      child: Row(
        children: [
          for (final segment in segments)
            Expanded(
              child: Semantics(
                button: true,
                selected: segment.value == selected,
                label: segment.label,
                excludeSemantics: true,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    if (segment.value == selected) return;
                    HapticFeedback.selectionClick();
                    onChanged(segment.value);
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    curve: Curves.easeOut,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: segment.value == selected ? Tokens.primaryNavy : Colors.transparent,
                      borderRadius: BorderRadius.circular(Tokens.rControl - 3),
                    ),
                    child: Text(
                      segment.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppText.button.copyWith(
                        fontSize: 14,
                        color: segment.value == selected ? Tokens.canvas : Tokens.muted,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class CategoryTile extends StatelessWidget {
  const CategoryTile({
    required this.label,
    required this.icon,
    required this.onTap,
    this.pngIcon,
    super.key,
  });

  final String label;
  final String icon;
  final String? pngIcon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: SizedBox(
          width: Tokens.categoryTileWidth,
          child: Column(
            children: [
              LiquidGlass(
                width: Tokens.categoryTileWidth,
                height: Tokens.categoryTileWidth,
                radius: Tokens.rCard,
                padding: const EdgeInsets.all(Tokens.s8),
                blur: true,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SvgPicture.asset(
                      icon,
                      fit: BoxFit.contain,
                      excludeFromSemantics: true,
                    ),
                    if (pngIcon != null)
                      Image.asset(
                        pngIcon!,
                        fit: BoxFit.contain,
                        excludeFromSemantics: true,
                      ),
                  ],
                ),
              ),
              const SizedBox(height: Tokens.s6),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppText.caption.copyWith(color: Tokens.primaryNavy, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AppFilterChip extends StatelessWidget {
  const AppFilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
    super.key,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final foreground = selected ? Tokens.canvas : Tokens.primaryNavy;
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: Tokens.tap),
          child: Center(
            child: AnimatedContainer(
              duration: Tokens.quick,
              height: Tokens.chipHeight,
              padding: const EdgeInsets.symmetric(horizontal: Tokens.s12),
              decoration: BoxDecoration(
                color: selected ? Tokens.primaryNavy : Colors.white,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: selected ? Tokens.primaryNavy : Tokens.hairline),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 16, color: foreground),
                    const SizedBox(width: Tokens.s6),
                  ],
                  Text(label, style: AppText.chip.copyWith(color: foreground)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class AppCompactButton extends StatelessWidget {
  const AppCompactButton({
    required this.label,
    required this.onPressed,
    this.icon,
    this.tone = AppCompactTone.solid,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final AppCompactTone tone;

  @override
  Widget build(BuildContext context) {
    final solid = tone == AppCompactTone.solid;
    final onPhoto = tone == AppCompactTone.onPhoto;
    final background = solid || onPhoto ? Tokens.primaryNavy : Colors.white;
    final foreground = solid || onPhoto ? Tokens.canvas : Tokens.primaryNavy;
    return Semantics(
      button: true,
      enabled: onPressed != null,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: Tokens.tap),
        child: Center(
          widthFactor: 1,
          child: TextButton(
            onPressed: onPressed == null
                ? null
                : () {
                    HapticFeedback.selectionClick();
                    onPressed!();
                  },
            style: TextButton.styleFrom(
              minimumSize: const Size(0, Tokens.compactButtonHeight),
              fixedSize: const Size.fromHeight(Tokens.compactButtonHeight),
              padding: const EdgeInsets.symmetric(horizontal: Tokens.s16),
              backgroundColor: background,
              foregroundColor: foreground,
              textStyle: AppText.button.copyWith(fontSize: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(Tokens.rControl),
                side: solid || onPhoto ? BorderSide.none : const BorderSide(color: Tokens.hairline),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(label),
                if (icon != null) ...[const SizedBox(width: Tokens.s6), Icon(icon, size: 16)],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

enum AppCompactTone { solid, outline, onPhoto }

class AppTextAction extends StatelessWidget {
  const AppTextAction({required this.label, required this.onPressed, super.key});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        minimumSize: const Size(Tokens.tap, Tokens.tap),
        padding: const EdgeInsets.symmetric(horizontal: Tokens.s8),
        foregroundColor: Tokens.primaryNavy,
        textStyle: AppText.captionStrong.copyWith(fontSize: 13),
      ),
      child: Text(label),
    );
  }
}

class AppIconButton extends StatelessWidget {
  const AppIconButton({
    required this.icon,
    required this.semanticLabel,
    required this.onPressed,
    this.size = Tokens.controlIcon,
    this.color = Tokens.primaryNavy,
    this.background,
    super.key,
  });

  final IconData icon;
  final String semanticLabel;
  final VoidCallback onPressed;
  final double size;
  final Color color;
  final Color? background;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.selectionClick();
          onPressed();
        },
        child: SizedBox(
          width: Tokens.tap,
          height: Tokens.tap,
          child: Center(
            child: background == null
                ? Icon(icon, size: size, color: color)
                : Container(
                    width: Tokens.badgeSize,
                    height: Tokens.badgeSize,
                    decoration: BoxDecoration(color: background, shape: BoxShape.circle),
                    child: Icon(icon, size: size, color: color),
                  ),
          ),
        ),
      ),
    );
  }
}

class AppSectionHeader extends StatelessWidget {
  const AppSectionHeader({
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
    this.padding = const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s24, Tokens.s8, Tokens.s8),
    super.key,
  });

  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppText.sectionTitle),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle!, style: AppText.caption),
                ],
              ],
            ),
          ),
          if (actionLabel != null && onAction != null) AppTextAction(label: actionLabel!, onPressed: onAction!),
        ],
      ),
    );
  }
}

class AppInlineNotice extends StatelessWidget {
  const AppInlineNotice({
    required this.icon,
    required this.message,
    this.trailing,
    super.key,
  });

  final IconData icon;
  final String message;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(Tokens.s12, Tokens.s4, Tokens.s4, Tokens.s4),
      constraints: const BoxConstraints(minHeight: 52),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Tokens.rControl),
        border: Border.all(color: Tokens.hairline),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, size: Tokens.controlIcon, color: Tokens.primaryNavy),
          const SizedBox(width: Tokens.s12),
          Expanded(child: Text(message, style: AppText.control.copyWith(color: Tokens.primaryNavy))),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class AppPickerField extends StatelessWidget {
  const AppPickerField({
    required this.label,
    required this.value,
    required this.icon,
    required this.onTap,
    super.key,
  });

  final String label;
  final String value;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '$label, $value',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: Container(
          height: Tokens.searchFieldHeight + 4,
          padding: const EdgeInsets.symmetric(horizontal: Tokens.s12),
          decoration: _controlSurface(),
          child: Row(
            children: [
              Icon(icon, size: 18, color: Tokens.muted),
              const SizedBox(width: Tokens.s8),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: AppText.caption.copyWith(fontSize: 11)),
                    Text(value,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppText.control.copyWith(fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AppMinimumPicker extends StatelessWidget {
  const AppMinimumPicker({
    required this.label,
    required this.value,
    required this.onChanged,
    this.options = const [1, 2, 3, 4],
    super.key,
  });

  final String label;
  final int? value;
  final ValueChanged<int?> onChanged;
  final List<int> options;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppText.caption.copyWith(fontWeight: FontWeight.w600, color: Tokens.primaryNavy)),
        const SizedBox(height: Tokens.s6),
        Wrap(
          spacing: Tokens.s6,
          children: [
            AppFilterChip(label: 'Any', selected: value == null, onTap: () => onChanged(null)),
            for (final option in options)
              AppFilterChip(label: '$option+', selected: value == option, onTap: () => onChanged(option)),
          ],
        ),
      ],
    );
  }
}
