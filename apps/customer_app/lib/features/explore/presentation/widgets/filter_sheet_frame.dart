import 'package:flutter/material.dart';

import '../../../../design/components.dart';
import '../../../../design/controls.dart';
import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';

class FilterSheetFrame extends StatelessWidget {
  const FilterSheetFrame({required this.onReset, required this.onApply, required this.children, super.key});

  final VoidCallback onReset;
  final VoidCallback onApply;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.86),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(Tokens.gutter, 0, Tokens.s8, 0),
              child: Row(
                children: [
                  const Expanded(child: Text('Filters', style: AppText.sectionTitle)),
                  AppTextAction(label: 'Reset', onPressed: onReset),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s16),
              child: AppButton(label: 'Show results', onPressed: onApply),
            ),
          ],
        ),
      ),
    );
  }
}

class FilterSection extends StatelessWidget {
  const FilterSection({required this.title, required this.child, super.key});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: Tokens.s20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppText.fieldValue.copyWith(color: Tokens.primaryNavy)),
          const SizedBox(height: Tokens.s8),
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
      spacing: Tokens.s6,
      children: [
        for (final option in options)
          AppFilterChip(label: labelFor(option), selected: isSelected(option), onTap: () => onTap(option)),
      ],
    );
  }
}
