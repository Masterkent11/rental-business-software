import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../design/tokens.dart';
import '../../../../design/typography.dart';
import '../../application/stay_search_controller.dart';
import '../../application/stay_search_state.dart';

class StayDateFields extends ConsumerWidget {
  const StayDateFields({required this.args, super.key});

  static final DateFormat _format = DateFormat('EEE, d MMM y');

  final StaySearchArgs args;

  Future<void> _pickRange(BuildContext context, WidgetRef ref, StaySearchState state) async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: state.firstBookableDay,
      lastDate: state.lastBookableDay,
      initialDateRange: DateTimeRange(start: state.checkIn, end: state.checkOut),
      helpText: 'Choose your stay',
    );
    if (range != null) ref.read(staySearchProvider(args).notifier).setShortStayDates(range.start, range.end);
  }

  Future<void> _pickMoveIn(BuildContext context, WidgetRef ref, StaySearchState state) async {
    final picked = await showDatePicker(
      context: context,
      firstDate: state.firstBookableDay,
      lastDate: state.lastBookableDay,
      initialDate: state.moveIn,
      helpText: 'Move-in date',
    );
    if (picked != null) ref.read(staySearchProvider(args).notifier).setMoveIn(picked);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(staySearchProvider(args));
    if (!state.isShortStay) {
      return StayFieldFrame(
        child: _DateField(
          label: 'Move-in date',
          value: _format.format(state.moveIn),
          onTap: () => _pickMoveIn(context, ref, state),
        ),
      );
    }
    return StayFieldFrame(
      child: Row(
        children: [
          Expanded(
            child: _DateField(
              label: 'Check-in',
              value: _format.format(state.checkIn),
              onTap: () => _pickRange(context, ref, state),
            ),
          ),
          const SizedBox(width: 1, height: Tokens.s32, child: ColoredBox(color: Tokens.hairline)),
          Expanded(
            child: _DateField(
              label: 'Check-out',
              value: _format.format(state.checkOut),
              onTap: () => _pickRange(context, ref, state),
            ),
          ),
        ],
      ),
    );
  }
}

class StayFieldFrame extends StatelessWidget {
  const StayFieldFrame({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: Tokens.fieldHeight),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Tokens.rControl),
        border: Border.all(color: Tokens.hairline),
      ),
      child: child,
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({required this.label, required this.value, required this.onTap});

  final String label;
  final String value;
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
        child: Padding(
          padding: const EdgeInsets.all(Tokens.s12),
          child: Row(
            children: [
              const Icon(Icons.calendar_today_outlined, size: Tokens.iconMd, color: Tokens.primaryNavy),
              const SizedBox(width: Tokens.s8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(label, style: AppText.fieldLabel),
                    const SizedBox(height: Tokens.s2),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(value, maxLines: 1, style: AppText.fieldValue),
                    ),
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
