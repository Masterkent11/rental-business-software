import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../../design/money.dart';
import '../../data/api_client.dart';
import '../../fixtures/view_models.dart';
import '../../data/application_repository.dart';
import '../../data/listing_repository.dart';
import '../../design/tokens.dart';

class ApplyScreen extends ConsumerStatefulWidget {
  const ApplyScreen({required this.listingId, super.key});

  final String listingId;

  @override
  ConsumerState<ApplyScreen> createState() => _ApplyScreenState();
}

class _ApplyScreenState extends ConsumerState<ApplyScreen> {
  bool _submitting = false;

  DateTime _moveIn = DateTime.now().add(const Duration(days: 14));
  int _occupants = 1;
  final _documents = <String, bool>{
    'Valid government ID': false,
    'Proof of income': false,
    'Barangay clearance': false,
  };

  bool get _ready => _documents.values.any((attached) => attached);

  Future<void> _submit(ListingCardView card) async {
    setState(() => _submitting = true);

    try {
      await ref
          .read(applicationRepositoryProvider)
          .submit(
            resourceId: card.resourceId,
            desiredMoveIn: _moveIn,
            desiredTermMonths: 12,
            message:
                '$_occupants ${_occupants == 1 ? "person" : "people"} '
                'expected to live here.',
          );
      ref.invalidate(applicationsProvider);

      if (!mounted) return;
      Navigator.of(context).maybePop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Sent to the owner. This does not reserve the place — you will be '
            'told the moment they decide.',
          ),
        ),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(listingDetailProvider(widget.listingId));
    final detail = detailAsync.valueOrNull;

    if (detailAsync.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (detail == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Apply to rent')),
        body: const Center(child: Text('This place is no longer available.')),
      );
    }

    final theme = Theme.of(context);
    final card = detail.card;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Apply to rent'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: ListView(
        physics: Tokens.scroll,
        padding: const EdgeInsets.fromLTRB(
          Tokens.gutter,
          0,
          Tokens.gutter,
          Tokens.s40,
        ),
        children: [
          Container(
            padding: const EdgeInsets.all(Tokens.s16),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(Tokens.rMd),
              border: Border.all(color: theme.colorScheme.outlineVariant),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(card.title, style: theme.textTheme.titleMedium),
                      const SizedBox(height: 2),
                      Text(card.location, style: theme.textTheme.bodySmall),
                    ],
                  ),
                ),
                Text(
                  Money.perMonth(card.priceCentavos),
                  style: theme.textTheme.titleMedium,
                ),
              ],
            ),
          ),
          const SizedBox(height: Tokens.s24),
          const _FieldLabel('When do you want to move in?'),
          const SizedBox(height: Tokens.s8),
          _DateField(
            value: _moveIn,
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _moveIn,
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 365)),
              );
              if (picked != null) setState(() => _moveIn = picked);
            },
          ),
          const SizedBox(height: Tokens.s24),
          const _FieldLabel('How many people will live here?'),
          const SizedBox(height: Tokens.s8),
          _Stepper(
            value: _occupants,
            onChanged: (v) => setState(() => _occupants = v),
          ),
          const SizedBox(height: Tokens.s24),
          const _FieldLabel('Documents the owner asks for'),
          const SizedBox(height: Tokens.s4),
          Text(
            'Photograph them now — the platform carries them to the owner and '
            'does not score or check them.',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: Tokens.s12),
          for (final entry in _documents.entries)
            _DocumentRow(
              label: entry.key,
              attached: entry.value,
              onTap: () => setState(() => _documents[entry.key] = !entry.value),
            ),
          const SizedBox(height: Tokens.s24),
          Container(
            padding: const EdgeInsets.all(Tokens.s16),
            decoration: BoxDecoration(
              color: Tokens.accent.withOpacity(0.06),
              borderRadius: BorderRadius.circular(Tokens.rSm),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.info_outline, size: 18, color: Tokens.accent),
                const SizedBox(width: Tokens.s12),
                Expanded(
                  child: Text(
                    'Applying does not reserve this place. Other people may '
                    'apply for it too — it is only held once the owner '
                    'approves you.',
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          ),
          if (card.moveInCost != null) ...[
            const SizedBox(height: Tokens.s24),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'If approved, to move in',
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
                const SizedBox(width: Tokens.s12),
                Text(
                  Money.peso(card.moveInCost!.totalCentavos),
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: Tokens.accent,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          border: Border(
            top: BorderSide(color: theme.colorScheme.outlineVariant),
          ),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(Tokens.gutter),
            child: FilledButton(
              onPressed: _ready && !_submitting ? () => _submit(card) : null,
              child: _submitting
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(
                      _ready
                          ? 'Submit application'
                          : 'Attach at least one document',
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) =>
      Text(text, style: Theme.of(context).textTheme.titleMedium);
}

class _DateField extends StatelessWidget {
  const _DateField({required this.value, required this.onTap});

  final DateTime value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 54,
        padding: const EdgeInsets.symmetric(horizontal: Tokens.s16),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(Tokens.rMd),
          border: Border.all(color: theme.colorScheme.outlineVariant),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_today_outlined, size: 18),
            const SizedBox(width: Tokens.s12),
            Expanded(
              child: Text(
                DateFormat('EEE, d MMM yyyy').format(value),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyLarge,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper({required this.value, required this.onChanged});

  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      height: 54,
      padding: const EdgeInsets.symmetric(horizontal: Tokens.s8),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(Tokens.rMd),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Row(
        children: [
          const SizedBox(width: Tokens.s8),
          Text(
            '$value ${value == 1 ? "person" : "people"}',
            style: theme.textTheme.bodyLarge,
          ),
          const Spacer(),
          _RoundButton(
            icon: Icons.remove,
            onTap: value > 1 ? () => onChanged(value - 1) : null,
          ),
          const SizedBox(width: Tokens.s8),
          _RoundButton(
            icon: Icons.add,
            onTap: value < 8 ? () => onChanged(value + 1) : null,
          ),
        ],
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final enabled = onTap != null;

    return GestureDetector(
      onTap: enabled
          ? () {
              HapticFeedback.selectionClick();
              onTap!();
            }
          : null,
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: theme.colorScheme.outlineVariant),
        ),
        child: Icon(
          icon,
          size: 18,
          color: enabled
              ? theme.colorScheme.onSurface
              : theme.colorScheme.onSurfaceVariant.withOpacity(0.4),
        ),
      ),
    );
  }
}

class _DocumentRow extends StatelessWidget {
  const _DocumentRow({
    required this.label,
    required this.attached,
    required this.onTap,
  });

  final String label;
  final bool attached;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: Tokens.s8),
      child: GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: Container(
          padding: const EdgeInsets.all(Tokens.s16),
          decoration: BoxDecoration(
            color: attached
                ? Tokens.available.withOpacity(0.07)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(Tokens.rMd),
            border: Border.all(
              color: attached
                  ? Tokens.available.withOpacity(0.35)
                  : theme.colorScheme.outlineVariant,
            ),
          ),
          child: Row(
            children: [
              Icon(
                attached ? Icons.check_circle : Icons.photo_camera_outlined,
                size: 20,
                color: attached
                    ? Tokens.available
                    : theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: Tokens.s12),
              Expanded(child: Text(label, style: theme.textTheme.bodyLarge)),
              Text(
                attached ? 'Attached' : 'Add photo',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: attached
                      ? Tokens.available
                      : theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
