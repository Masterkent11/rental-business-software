import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../design/tokens.dart';
import '../../domain/lease_duration.dart';

class LeaseDurationSheet extends StatelessWidget {
  const LeaseDurationSheet({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final LeaseDuration selected;
  final ValueChanged<LeaseDuration> onSelected;

  static Future<void> show(
    BuildContext context, {
    required LeaseDuration selected,
    required ValueChanged<LeaseDuration> onSelected,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => LeaseDurationSheet(
        selected: selected,
        onSelected: onSelected,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: theme.colorScheme.surface,
      borderRadius:
          const BorderRadius.vertical(top: Radius.circular(Tokens.rLg)),
      clipBehavior: Clip.antiAlias,
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 8, bottom: 4),
                width: 32,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: Tokens.s8,
                vertical: Tokens.s4,
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  Expanded(
                    child: Text(
                      'Select lease duration',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),
            const Divider(height: 1),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(vertical: Tokens.s8),
                itemCount: LeaseDuration.values.length,
                separatorBuilder: (_, __) => const Divider(
                  height: 1,
                  indent: Tokens.gutter,
                  endIndent: Tokens.gutter,
                ),
                itemBuilder: (context, index) {
                  final duration = LeaseDuration.values[index];
                  final isSelected = duration == selected;

                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: Tokens.gutter,
                    ),
                    title: Text(
                      duration.label,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight:
                            isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? Tokens.primaryBlue : Tokens.ink,
                      ),
                    ),
                    trailing: isSelected
                        ? const Icon(
                            Icons.check_circle_rounded,
                            color: Tokens.primaryBlue,
                            size: 20,
                          )
                        : null,
                    onTap: () {
                      HapticFeedback.selectionClick();
                      onSelected(duration);
                      Navigator.of(context).pop();
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: Tokens.s12),
          ],
        ),
      ),
    );
  }
}
