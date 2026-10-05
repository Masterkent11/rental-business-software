import 'package:flutter/material.dart';

import '../../../../design/quantity_stepper.dart';
import '../../../../design/tokens.dart';
import '../../domain/occupancy_limits.dart';

class OccupantsSheet extends StatefulWidget {
  const OccupantsSheet({
    super.key,
    required this.title,
    required this.label,
    required this.initialCount,
    required this.onSaved,
    this.min = OccupancyLimits.minGuests,
    this.max = OccupancyLimits.maxGuests,
  });

  final String title;
  final String label;
  final int initialCount;
  final ValueChanged<int> onSaved;
  final int min;
  final int max;

  static Future<void> show(
    BuildContext context, {
    required String title,
    required String label,
    required int initialCount,
    required ValueChanged<int> onSaved,
    int min = OccupancyLimits.minGuests,
    int max = OccupancyLimits.maxGuests,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => OccupantsSheet(
        title: title,
        label: label,
        initialCount: initialCount,
        onSaved: onSaved,
        min: min,
        max: max,
      ),
    );
  }

  @override
  State<OccupantsSheet> createState() => _OccupantsSheetState();
}

class _OccupantsSheetState extends State<OccupantsSheet> {
  late int _count;

  @override
  void initState() {
    super.initState();
    _count = widget.initialCount;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius:
            const BorderRadius.vertical(top: Radius.circular(Tokens.rLg)),
      ),
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
                      widget.title,
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
            Padding(
              padding: const EdgeInsets.all(Tokens.s20),
              child: QuantityStepper(
                label: widget.label,
                value: _count,
                min: widget.min,
                max: widget.max,
                compact: false,
                onChanged: (v) {
                  setState(() => _count = v);
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                Tokens.s16,
                0,
                Tokens.s16,
                Tokens.s16,
              ),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    widget.onSaved(_count);
                    Navigator.of(context).pop();
                  },
                  child: const Text('Apply'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
