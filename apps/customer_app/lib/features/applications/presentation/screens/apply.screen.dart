import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../app/composition_root.dart';
import '../../../../core/design/tokens.dart';
import '../../../../core/domain/value_objects/money.value_object.dart';
import '../../../listings/domain/entities/listing.entity.dart';

class ApplyScreen extends ConsumerStatefulWidget {
  const ApplyScreen({required this.listing, super.key});
  final Listing listing;

  @override
  ConsumerState<ApplyScreen> createState() => _ApplyScreenState();
}

class _ApplyScreenState extends ConsumerState<ApplyScreen> {
  DateTime _moveIn = DateTime.now().add(const Duration(days: 14));
  int _termMonths = 12;
  final _message = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final useCase = ref.read(submitApplicationUseCaseProvider);
      await useCase.call(
        resourceId: widget.listing.resourceId.isNotEmpty
            ? widget.listing.resourceId
            : widget.listing.id,
        desiredMoveIn: _moveIn,
        desiredTermMonths: _termMonths,
        notes: _message.text.trim(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Application submitted successfully!')),
        );
        context.go('/applications');
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFmt = DateFormat('MMMM d, yyyy');

    return Scaffold(
      appBar: AppBar(title: const Text('Apply for Rental')),
      body: ListView(
        padding: const EdgeInsets.all(Tokens.gutter),
        children: [
          Container(
            padding: const EdgeInsets.all(Tokens.s16),
            decoration: BoxDecoration(
              color: Tokens.surfaceMuted,
              borderRadius: Tokens.borderLg,
              border: Border.all(color: Tokens.line),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.listing.title,
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: Tokens.s4),
                Text(
                  widget.listing.propertyName,
                  style: theme.textTheme.bodySmall?.copyWith(color: Tokens.inkMuted),
                ),
                const SizedBox(height: Tokens.s8),
                Text(
                  '${Money.formatPesos(widget.listing.priceCentavos)} / month',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Tokens.ink,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: Tokens.s24),
          Text('Desired Move-In Date', style: theme.textTheme.titleSmall),
          const SizedBox(height: Tokens.s8),
          OutlinedButton.icon(
            icon: const Icon(Icons.calendar_today_outlined, size: 18),
            label: Text(dateFmt.format(_moveIn)),
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _moveIn,
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 180)),
              );
              if (picked != null) setState(() => _moveIn = picked);
            },
          ),
          const SizedBox(height: Tokens.s20),
          Text('Lease Term', style: theme.textTheme.titleSmall),
          const SizedBox(height: Tokens.s8),
          SegmentedButton<int>(
            segments: const [
              ButtonSegment(value: 6, label: Text('6 months')),
              ButtonSegment(value: 12, label: Text('12 months')),
              ButtonSegment(value: 24, label: Text('24 months')),
            ],
            selected: {_termMonths},
            onSelectionChanged: (s) => setState(() => _termMonths = s.first),
          ),
          const SizedBox(height: Tokens.s20),
          Text('Message to Owner (Optional)', style: theme.textTheme.titleSmall),
          const SizedBox(height: Tokens.s8),
          TextField(
            controller: _message,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'Introduce yourself or ask any specific questions...',
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: Tokens.s16),
            Text(_error!, style: const TextStyle(color: Tokens.danger, fontSize: 13)),
          ],
          const SizedBox(height: Tokens.s32),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Tokens.surface),
                  )
                : const Text('Submit Application'),
          ),
        ],
      ),
    );
  }
}
