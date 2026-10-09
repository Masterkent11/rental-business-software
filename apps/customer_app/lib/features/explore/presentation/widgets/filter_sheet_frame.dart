import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../design/components.dart';
import '../../../../design/controls.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';

const double kListingSheetMaxHeightFactor = 0.9;

Future<T?> showListingSheet<T>(BuildContext context, {required WidgetBuilder builder}) {
  final height = MediaQuery.sizeOf(context).height;
  return showModalBottomSheet<T>(
    context: context,
    useRootNavigator: true,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: false,
    backgroundColor: Tokens.card,
    barrierColor: Tokens.primaryNavy.withValues(alpha: 0.38),
    clipBehavior: Clip.antiAlias,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(Tokens.rLg))),
    constraints: BoxConstraints(maxHeight: height * kListingSheetMaxHeightFactor),
    builder: builder,
  );
}

class FilterSheetFrame extends StatelessWidget {
  const FilterSheetFrame({
    required this.children,
    this.title = 'Filters',
    this.onReset,
    this.onApply,
    this.applyLabel = 'Show results',
    super.key,
  });

  final String title;
  final VoidCallback? onReset;
  final VoidCallback? onApply;
  final String applyLabel;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const Key('listing-sheet'),
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _DragHandle(),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: Tokens.s4),
          child: SizedBox(
            height: Tokens.tap + Tokens.s4,
            child: Row(
              children: [
                AppIconButton(
                  key: const Key('listing-sheet-close'),
                  icon: Icons.close_rounded,
                  semanticLabel: 'Close',
                  size: 22,
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
                Expanded(
                  child: Text(
                    title,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppText.cardTitle.copyWith(fontSize: 17),
                  ),
                ),
                if (onReset != null)
                  _ResetAction(onPressed: onReset!)
                else
                  const SizedBox(width: Tokens.tap),
              ],
            ),
          ),
        ),
        const Divider(height: 1, thickness: 1, color: Tokens.hairline),
        Flexible(
          child: SingleChildScrollView(
            physics: const ClampingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s16, Tokens.gutter, Tokens.s8),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
          ),
        ),
        if (onApply != null)
          DecoratedBox(
            decoration: const BoxDecoration(
              color: Tokens.card,
              border: Border(top: BorderSide(color: Tokens.hairline)),
            ),
            child: SafeArea(
              top: false,
              minimum: const EdgeInsets.only(bottom: Tokens.s12),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s12, Tokens.gutter, 0),
                child: AppButton(key: const Key('listing-sheet-apply'), label: applyLabel, onPressed: onApply),
              ),
            ),
          )
        else
          const SafeArea(top: false, minimum: EdgeInsets.only(bottom: Tokens.s12), child: SizedBox.shrink()),
      ],
    );
  }
}

class _DragHandle extends StatelessWidget {
  const _DragHandle();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: Tokens.s8, bottom: Tokens.s2),
      child: Center(
        child: Container(
          width: 36,
          height: 4,
          decoration: BoxDecoration(
            color: Tokens.muted.withValues(alpha: 0.35),
            borderRadius: const BorderRadius.all(Tokens.rPill),
          ),
        ),
      ),
    );
  }
}

class _ResetAction extends StatelessWidget {
  const _ResetAction({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: () {
        HapticFeedback.selectionClick();
        onPressed();
      },
      style: TextButton.styleFrom(
        minimumSize: const Size(Tokens.tap, Tokens.tap),
        padding: const EdgeInsets.symmetric(horizontal: Tokens.s12),
        foregroundColor: Tokens.muted,
        textStyle: AppText.control.copyWith(fontWeight: FontWeight.w500),
      ),
      child: const Text('Reset'),
    );
  }
}

class FilterSection extends StatelessWidget {
  const FilterSection({required this.title, required this.child, this.subtitle, this.divider = true, super.key});

  final String title;
  final String? subtitle;
  final Widget child;
  final bool divider;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(bottom: Tokens.s16),
      margin: const EdgeInsets.only(bottom: Tokens.s16),
      decoration: BoxDecoration(
        border: divider ? const Border(bottom: BorderSide(color: Tokens.hairline)) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: AppText.cardTitle),
          if (subtitle != null) ...[
            const SizedBox(height: Tokens.s2),
            Text(subtitle!, style: AppText.caption),
          ],
          const SizedBox(height: Tokens.s12),
          child,
        ],
      ),
    );
  }
}

class FilterChoiceWrap<T> extends StatelessWidget {
  const FilterChoiceWrap({
    required this.options,
    required this.labelFor,
    required this.isSelected,
    required this.onTap,
    super.key,
  });

  final List<T> options;
  final String Function(T option) labelFor;
  final bool Function(T option) isSelected;
  final ValueChanged<T> onTap;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: Tokens.s8,
      runSpacing: Tokens.s8,
      children: [
        for (final option in options)
          FilterOptionTile(label: labelFor(option), selected: isSelected(option), onTap: () => onTap(option)),
      ],
    );
  }
}

class FilterOptionRow<T> extends StatelessWidget {
  const FilterOptionRow({
    required this.options,
    required this.labelFor,
    required this.isSelected,
    required this.onTap,
    super.key,
  });

  final List<T> options;
  final String Function(T option) labelFor;
  final bool Function(T option) isSelected;
  final ValueChanged<T> onTap;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (index, option) in options.indexed) ...[
            if (index > 0) const SizedBox(width: Tokens.s6),
            Expanded(
              child: FilterOptionTile(
                label: labelFor(option),
                selected: isSelected(option),
                onTap: () => onTap(option),
                expand: true,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class FilterOptionTile extends StatelessWidget {
  const FilterOptionTile({
    required this.label,
    required this.selected,
    required this.onTap,
    this.expand = false,
    super.key,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: label.replaceAll('\n', ' '),
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: AnimatedContainer(
          duration: Tokens.quick,
          curve: Tokens.ease,
          constraints: const BoxConstraints(minHeight: Tokens.tap),
          padding: const EdgeInsets.symmetric(horizontal: Tokens.s12, vertical: Tokens.s6),
          decoration: BoxDecoration(
            color: selected ? Tokens.primaryNavy : Tokens.card,
            borderRadius: BorderRadius.circular(Tokens.s8),
            border: Border.all(color: selected ? Tokens.primaryNavy : Tokens.hairline),
          ),
          child: Center(
            widthFactor: expand ? null : 1,
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: AppText.chip.copyWith(
                fontSize: label.contains('\n') ? 12 : 13,
                height: 1.2,
                color: selected ? Tokens.canvas : Tokens.primaryNavy,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class FilterFeatureGrid<T> extends StatelessWidget {
  const FilterFeatureGrid({
    required this.options,
    required this.labelFor,
    required this.iconFor,
    required this.isSelected,
    required this.onTap,
    super.key,
  });

  final List<T> options;
  final String Function(T option) labelFor;
  final IconData Function(T option) iconFor;
  final bool Function(T option) isSelected;
  final ValueChanged<T> onTap;

  @override
  Widget build(BuildContext context) {
    final rows = <List<T>>[
      for (var i = 0; i < options.length; i += 2) options.sublist(i, i + 2 > options.length ? options.length : i + 2),
    ];
    return Column(
      children: [
        for (final (index, row) in rows.indexed) ...[
          if (index > 0) const SizedBox(height: Tokens.s8),
          Row(
            children: [
              for (final (column, option) in row.indexed) ...[
                if (column > 0) const SizedBox(width: Tokens.s8),
                Expanded(
                  child: _FeatureTile(
                    label: labelFor(option),
                    icon: iconFor(option),
                    selected: isSelected(option),
                    onTap: () => onTap(option),
                  ),
                ),
              ],
              if (row.length == 1) ...[const SizedBox(width: Tokens.s8), const Expanded(child: SizedBox.shrink())],
            ],
          ),
        ],
      ],
    );
  }
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({required this.label, required this.icon, required this.selected, required this.onTap});

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
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
        child: AnimatedContainer(
          duration: Tokens.quick,
          curve: Tokens.ease,
          height: 52,
          padding: const EdgeInsets.symmetric(horizontal: Tokens.s12),
          decoration: BoxDecoration(
            color: selected ? Tokens.softBlue : Tokens.card,
            borderRadius: BorderRadius.circular(Tokens.rSm),
            border: Border.all(color: selected ? Tokens.primaryNavy.withValues(alpha: 0.18) : Tokens.hairline),
          ),
          child: Row(
            children: [
              Icon(icon, size: Tokens.controlIcon, color: Tokens.primaryNavy),
              const SizedBox(width: Tokens.s8),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppText.chip.copyWith(color: Tokens.primaryNavy, fontWeight: FontWeight.w500),
                ),
              ),
              AnimatedContainer(
                duration: Tokens.quick,
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selected ? Tokens.primaryNavy : Colors.transparent,
                  border: Border.all(color: selected ? Tokens.primaryNavy : Tokens.muted.withValues(alpha: 0.5), width: 1.5),
                ),
                child: selected ? const Icon(Icons.check_rounded, size: 14, color: Tokens.canvas) : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
