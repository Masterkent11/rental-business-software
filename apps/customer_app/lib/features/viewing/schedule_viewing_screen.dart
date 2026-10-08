import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../app/router.dart';
import '../../data/api_client.dart';
import '../../data/ids.dart';
import '../../data/listing_repository.dart';
import '../../data/marketplace_repository.dart';
import '../../data/messaging_repository.dart';
import '../../design/tokens.dart';

const Duration kManilaOffset = Duration(hours: 8);

DateTime manilaWallClock(DateTime instant) => instant.toUtc().add(kManilaOffset);

String slotTimeLabel(DateTime instant) => DateFormat('h:mm a').format(manilaWallClock(instant));

String dayChipWeekday(String isoDate) => DateFormat('EEE').format(DateTime.parse(isoDate));

String dayChipNumber(String isoDate) => DateFormat('d').format(DateTime.parse(isoDate));

String dayHeading(String isoDate) => DateFormat('EEEE, MMMM d').format(DateTime.parse(isoDate));

class ScheduleViewingScreen extends ConsumerStatefulWidget {
  const ScheduleViewingScreen({required this.listingId, this.rescheduleId, super.key});

  final String listingId;
  final String? rescheduleId;

  @override
  ConsumerState<ScheduleViewingScreen> createState() => _ScheduleViewingScreenState();
}

class _ScheduleViewingScreenState extends ConsumerState<ScheduleViewingScreen> {
  final _note = TextEditingController();
  final String _clientRef = newUuid();
  String? _day;
  DateTime? _slot;
  bool _sending = false;
  String? _error;
  ViewingView? _done;

  bool get _rescheduling => widget.rescheduleId != null;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final slot = _slot;
    if (slot == null) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    final repository = ref.read(marketplaceRepositoryProvider);
    try {
      final viewing = _rescheduling
          ? await repository.rescheduleViewing(widget.rescheduleId!, slot)
          : await repository.requestViewing(listingId: widget.listingId, startsAt: slot, note: _note.text, clientRef: _clientRef);
      HapticFeedback.mediumImpact();
      ref.invalidate(myViewingsProvider);
      ref.invalidate(viewingSlotsProvider(widget.listingId));
      ref.read(inboxProvider.notifier).refreshQuietly();
      if (mounted) setState(() => _done = viewing);
    } on ApiException catch (error) {
      if (error.code == 'SLOT_TAKEN') {
        ref.invalidate(viewingSlotsProvider(widget.listingId));
        if (mounted) setState(() => _slot = null);
      }
      if (mounted) {
        setState(() => _error = switch (error.code) {
              'SLOT_TAKEN' => 'Someone just booked that time. Please pick another slot.',
              'ALREADY_REQUESTED' => 'You already have a viewing requested for this property. Check Inquiries & viewings in your profile.',
              _ => error.message,
            });
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(listingDetailProvider(widget.listingId));
    final slots = ref.watch(viewingSlotsProvider(widget.listingId));
    final card = detail.valueOrNull?.card;

    return Scaffold(
      backgroundColor: Tokens.canvas,
      appBar: AppBar(
        backgroundColor: Tokens.canvas,
        title: Text(_rescheduling ? 'Choose a new time' : 'Schedule a viewing'),
        leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new, size: 18), onPressed: () => Navigator.of(context).maybePop()),
      ),
      body: _done != null
          ? _Confirmed(viewing: _done!, rescheduled: _rescheduling)
          : switch (slots) {
              AsyncError(:final error) => _Retry(
                  message: error is ApiException ? error.message : 'We could not load viewing times.',
                  onRetry: () => ref.invalidate(viewingSlotsProvider(widget.listingId)),
                ),
              AsyncData(:final value) => _picker(value, card?.title ?? '', card?.place ?? ''),
              _ => const Center(child: CircularProgressIndicator()),
            },
      bottomNavigationBar: _done != null
          ? null
          : SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s12),
                child: FilledButton(
                  onPressed: _slot == null || _sending ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: Tokens.primaryNavy,
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Tokens.rSm)),
                  ),
                  child: _sending
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
                      : Text(_slot == null
                          ? 'Pick a time'
                          : '${_rescheduling ? 'Request' : 'Request viewing'} · ${dayChipWeekday(_day!)} ${slotTimeLabel(_slot!)}'),
                ),
              ),
            ),
    );
  }

  Widget _picker(List<ViewingDay> days, String title, String place) {
    final theme = Theme.of(context);
    final open = days.where((d) => d.hasOpenSlot).toList();
    if (open.isEmpty) {
      return const _Retry(message: 'No viewing times are open in the next three weeks. Message the agent or owner to arrange one.');
    }
    final day = open.firstWhere((d) => d.date == _day, orElse: () => open.first);
    _day ??= day.date;

    return ListView(
      physics: Tokens.scroll,
      padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s8, Tokens.gutter, Tokens.s32),
      children: [
        if (title.isNotEmpty) ...[
          Text(title, style: theme.textTheme.titleMedium?.copyWith(color: Tokens.primaryNavy)),
          Text(place, style: const TextStyle(color: Tokens.muted)),
          const SizedBox(height: Tokens.s20),
        ],
        Text('Select a date', style: theme.textTheme.titleLarge),
        const SizedBox(height: Tokens.s12),
        SizedBox(
          height: 76,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: Tokens.scroll,
            itemCount: open.length,
            separatorBuilder: (_, __) => const SizedBox(width: Tokens.s8),
            itemBuilder: (context, i) {
              final item = open[i];
              final selected = item.date == day.date;
              return Semantics(
                button: true,
                selected: selected,
                label: dayHeading(item.date),
                child: GestureDetector(
                  onTap: () => setState(() {
                    _day = item.date;
                    _slot = null;
                    _error = null;
                  }),
                  child: AnimatedContainer(
                    duration: Tokens.quick,
                    width: 60,
                    decoration: BoxDecoration(
                      color: selected ? Tokens.primaryNavy : Colors.white,
                      borderRadius: BorderRadius.circular(Tokens.rSm),
                      border: Border.all(color: selected ? Tokens.primaryNavy : Tokens.hairline),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(dayChipWeekday(item.date), style: TextStyle(fontSize: 12, color: selected ? Colors.white70 : Tokens.muted)),
                        const SizedBox(height: 2),
                        Text(
                          dayChipNumber(item.date),
                          style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: selected ? Colors.white : Tokens.primaryNavy),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: Tokens.s24),
        Text('Select a time', style: theme.textTheme.titleLarge),
        const SizedBox(height: 4),
        Text('${dayHeading(day.date)} · Philippine time', style: const TextStyle(color: Tokens.muted, fontSize: 12.5)),
        const SizedBox(height: Tokens.s12),
        Wrap(
          spacing: Tokens.s8,
          runSpacing: Tokens.s8,
          children: [
            for (final slot in day.slots)
              ChoiceChip(
                label: Text(slotTimeLabel(slot.startsAt)),
                selected: _slot == slot.startsAt,
                showCheckmark: false,
                selectedColor: Tokens.primaryNavy,
                backgroundColor: Colors.white,
                disabledColor: const Color(0xFFF1F2F4),
                side: const BorderSide(color: Tokens.hairline),
                labelStyle: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: !slot.available
                      ? Tokens.muted
                      : _slot == slot.startsAt
                          ? Colors.white
                          : Tokens.primaryNavy,
                  decoration: slot.available ? null : TextDecoration.lineThrough,
                ),
                onSelected: slot.available
                    ? (_) => setState(() {
                          _slot = slot.startsAt;
                          _error = null;
                        })
                    : null,
              ),
          ],
        ),
        if (!_rescheduling) ...[
          const SizedBox(height: Tokens.s24),
          TextField(
            controller: _note,
            maxLength: 1000,
            minLines: 2,
            maxLines: 4,
            decoration: InputDecoration(
              labelText: 'Note for the agent (optional)',
              hintText: 'Who is coming, parking, questions to cover',
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(Tokens.rSm)),
            ),
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: Tokens.s12),
          Text(_error!, style: const TextStyle(color: Tokens.taken, fontWeight: FontWeight.w600)),
        ],
      ],
    );
  }
}

class _Confirmed extends StatelessWidget {
  const _Confirmed({required this.viewing, required this.rescheduled});

  final ViewingView viewing;
  final bool rescheduled;

  @override
  Widget build(BuildContext context) {
    final when = DateFormat("EEEE, MMMM d 'at' h:mm a").format(manilaWallClock(viewing.scheduledAt));
    return ListView(
      padding: const EdgeInsets.fromLTRB(Tokens.gutter, Tokens.s32, Tokens.gutter, Tokens.s40),
      children: [
        const Icon(Icons.event_available, size: 52, color: Tokens.primaryNavy),
        const SizedBox(height: Tokens.s16),
        Text(
          rescheduled ? 'New time requested' : 'Viewing requested',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: Tokens.s8),
        Text(
          '$when\n${viewing.partnerName} will confirm the time. We will notify you.',
          textAlign: TextAlign.center,
          style: const TextStyle(color: Tokens.muted, height: 1.4),
        ),
        const SizedBox(height: Tokens.s24),
        FilledButton(
          onPressed: () => context.pushReplacement(Routes.conversation(viewing.conversationId)),
          style: FilledButton.styleFrom(backgroundColor: Tokens.primaryNavy, minimumSize: const Size.fromHeight(50)),
          child: const Text('Open conversation'),
        ),
        const SizedBox(height: Tokens.s12),
        OutlinedButton(
          onPressed: () => context.pushReplacement(Routes.activity),
          style: OutlinedButton.styleFrom(foregroundColor: Tokens.primaryNavy, minimumSize: const Size.fromHeight(50)),
          child: const Text('See my viewings'),
        ),
      ],
    );
  }
}

class _Retry extends StatelessWidget {
  const _Retry({required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Tokens.s32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.event_busy_outlined, size: 36, color: Tokens.muted),
            const SizedBox(height: Tokens.s12),
            Text(message, textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: Tokens.s16),
              FilledButton(onPressed: onRetry, child: const Text('Try again')),
            ],
          ],
        ),
      ),
    );
  }
}
