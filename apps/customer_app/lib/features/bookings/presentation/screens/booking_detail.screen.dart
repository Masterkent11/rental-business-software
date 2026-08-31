import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/design/app_image.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/domain/value_objects/money.value_object.dart';
import '../../domain/entities/stay_receipt.entity.dart';

class BookingDetailScreen extends StatelessWidget {
  const BookingDetailScreen({required this.stay, super.key});
  final StayReceipt stay;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFmt = DateFormat('MMM d, yyyy');

    return Scaffold(
      appBar: AppBar(title: Text('Stay #${stay.reference}')),
      body: ListView(
        padding: const EdgeInsets.all(Tokens.gutter),
        children: [
          if (stay.photo != null)
            AppImage(
              url: stay.photo!,
              height: 200,
              borderRadius: Tokens.borderLg,
            ),
          const SizedBox(height: Tokens.s16),
          Text(
            stay.listingTitle,
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          ),
          Text(
            '${stay.propertyName} · ${stay.areaLabel}, ${stay.cityLabel}',
            style: theme.textTheme.bodyMedium?.copyWith(color: Tokens.inkMuted),
          ),
          const SizedBox(height: Tokens.s24),
          Container(
            padding: const EdgeInsets.all(Tokens.s16),
            decoration: BoxDecoration(
              color: Tokens.surfaceMuted,
              borderRadius: Tokens.borderLg,
              border: Border.all(color: Tokens.line),
            ),
            child: Column(
              children: [
                _DetailRow(
                  label: 'Check-in',
                  value: dateFmt.format(stay.startsOn),
                ),
                const Divider(),
                _DetailRow(
                  label: 'Check-out',
                  value: dateFmt.format(stay.endsOn),
                ),
                const Divider(),
                _DetailRow(
                  label: 'Duration',
                  value: '${stay.nights} nights',
                ),
                const Divider(),
                _DetailRow(
                  label: 'Total Paid',
                  value: Money.formatPesos(stay.paidCentavos),
                  isBold: true,
                ),
                const Divider(),
                _DetailRow(
                  label: 'Status',
                  value: stay.stateLabel,
                  highlight: true,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.label,
    required this.value,
    this.isBold = false,
    this.highlight = false,
  });

  final String label;
  final String value;
  final bool isBold;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Tokens.s8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Tokens.inkMuted)),
          Text(
            value,
            style: TextStyle(
              fontWeight: isBold || highlight ? FontWeight.bold : FontWeight.normal,
              color: highlight ? Tokens.accent : Tokens.ink,
            ),
          ),
        ],
      ),
    );
  }
}
