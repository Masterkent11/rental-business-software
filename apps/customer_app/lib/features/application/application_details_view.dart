import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../design/tokens.dart';
import '../../fixtures/view_models.dart';
import 'application_controller.dart';
import 'application_styles.dart';
import 'application_property_summary.dart';

class ApplicationDetailsView extends StatelessWidget {
  const ApplicationDetailsView(
      {required this.card, required this.state, required this.controller, this.requirements = const [], super.key});
  final ListingCardView card;
  final List<String> requirements;
  final ApplicationFlowState state;
  final ApplicationFlowController controller;

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        ApplicationPropertySummary(card: card),
        const SizedBox(height: Tokens.s32),
        const Text('When do you want to move in?', style: ApplicationStyles.label),
        const SizedBox(height: Tokens.s12),
        _FormOutline(
            child: ListTile(
                onTap: state.busy
                    ? null
                    : () async {
                        final now = DateTime.now();
                        final today = DateTime(now.year, now.month, now.day);
                        final picked = await showDatePicker(
                            context: context,
                            initialDate: state.moveIn.isBefore(today) ? today : state.moveIn,
                            firstDate: today,
                            lastDate: today.add(const Duration(days: 3650)));
                        if (picked != null) controller.edit(moveIn: picked);
                      },
                leading: const Icon(Icons.calendar_today_outlined, color: Tokens.primaryNavy),
                title: Text(DateFormat('EEE, d MMM yyyy').format(state.moveIn), style: ApplicationStyles.value),
                trailing: const Icon(Icons.keyboard_arrow_down, color: ApplicationStyles.navy, size: 20))),
        const SizedBox(height: Tokens.s32),
        const Text('How long do you plan to stay?', style: ApplicationStyles.label),
        const SizedBox(height: Tokens.s12),
        DropdownButtonFormField<int>(
          isExpanded: true,
          key: ValueKey(state.termMonths),
          initialValue:
              state.termMonths >= (card.minLeaseMonths ?? 1) && state.termMonths <= (card.maxLeaseMonths ?? 60)
                  ? state.termMonths
                  : null,
          decoration: InputDecoration(
              labelText: 'Rental term',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(Tokens.rControl))),
          items: [
            for (var months = card.minLeaseMonths ?? 1; months <= (card.maxLeaseMonths ?? 60); months++)
              DropdownMenuItem(value: months, child: Text('$months ${months == 1 ? 'month' : 'months'}'))
          ],
          onChanged: state.busy
              ? null
              : (value) {
                  if (value != null) controller.edit(termMonths: value);
                },
        ),
        const SizedBox(height: Tokens.s32),
        const Text('How many people will live here?', style: ApplicationStyles.label),
        const SizedBox(height: Tokens.s12),
        _FormOutline(
            child: Padding(
                padding: const EdgeInsets.only(left: Tokens.s16, right: Tokens.s4),
                child: Row(children: [
                  Expanded(
                      child: Text('${state.occupants} ${state.occupants == 1 ? 'person' : 'people'}',
                          style: ApplicationStyles.value)),
                  IconButton(
                      tooltip: 'Fewer occupants',
                      onPressed: !state.busy && state.occupants > 1
                          ? () => controller.edit(occupants: state.occupants - 1)
                          : null,
                      style: IconButton.styleFrom(
                          backgroundColor: ApplicationStyles.pale,
                          foregroundColor: ApplicationStyles.navy,
                          minimumSize: const Size(40, 40),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                      icon: const Icon(Icons.remove, size: 22)),
                  const SizedBox(width: 6),
                  IconButton(
                      tooltip: 'More occupants',
                      onPressed: !state.busy && state.occupants < card.maxGuests
                          ? () => controller.edit(occupants: state.occupants + 1)
                          : null,
                      style: IconButton.styleFrom(
                          backgroundColor: ApplicationStyles.pale,
                          foregroundColor: ApplicationStyles.navy,
                          minimumSize: const Size(40, 40),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                      icon: const Icon(Icons.add, size: 22)),
                ]))),
        if (requirements.isNotEmpty) ...[
          const SizedBox(height: Tokens.s24),
          const Text('Rental requirements', style: ApplicationStyles.label),
          const SizedBox(height: Tokens.s8),
          for (final requirement in requirements)
            Padding(padding: const EdgeInsets.only(bottom: 6), child: Text(requirement)),
        ],
      ]);
}

class _FormOutline extends StatelessWidget {
  const _FormOutline({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
      constraints: const BoxConstraints(minHeight: Tokens.fieldHeight),
      decoration: BoxDecoration(
          border: Border.all(color: ApplicationStyles.border), borderRadius: BorderRadius.circular(Tokens.rControl)),
      child: child);
}
